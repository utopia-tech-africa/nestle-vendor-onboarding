import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import { CatalogService } from "../outlet/catalog.service";
import { sellerTypeValues } from "../outlet/field-catalogs";
import type { CreateQuestionnaireDto, UpdateQuestionnaireDto } from "./dto/questionnaire.dto";
import { QuestionTypeDto as QuestionTypeEnum } from "./dto/questionnaire.dto";
import {
  DEFAULT_QUESTIONNAIRE_DESCRIPTION,
  DEFAULT_QUESTIONNAIRE_TITLE,
  buildDefaultQuestionnaireQuestions,
  competitorProductLabelsFromCatalog
} from "./default-questionnaire";
import { QuestionnaireRepository } from "./questionnaire.repository";

const MANAGER_ROLES = new Set<UserRole>(["admin", "supervisor"]);

@Injectable()
export class QuestionnaireService {
  public constructor(
    @Inject(QuestionnaireRepository) private readonly repository: QuestionnaireRepository,
    @Inject(CatalogService) private readonly catalogService: CatalogService
  ) {}

  private assertManager(user: AuthenticatedUser): void {
    if (!MANAGER_ROLES.has(user.role)) {
      throw new ForbiddenException("Only supervisor or admin can manage questionnaires");
    }
  }

  private mapQuestions(questions: CreateQuestionnaireDto["questions"]) {
    return (questions ?? []).map((q, index) => ({
      prompt: q.prompt.trim(),
      helpText: q.helpText?.trim() ?? null,
      type: (q.type ?? QuestionTypeEnum.text) as
        | "text"
        | "textarea"
        | "number"
        | "single_choice"
        | "multi_choice"
        | "boolean",
      optionsJson:
        q.options !== undefined && q.options.length > 0 ? JSON.stringify(q.options) : null,
      required: q.required ?? false,
      sortOrder: q.sortOrder ?? index,
      isActive: q.isActive ?? true
    }));
  }

  public listForAdmin(user: AuthenticatedUser) {
    this.assertManager(user);
    return this.repository.findAll();
  }

  public getActiveForField() {
    return this.repository.findActiveForField();
  }

  public async createForAdmin(user: AuthenticatedUser, dto: CreateQuestionnaireDto) {
    this.assertManager(user);
    return this.repository.create({
      title: dto.title.trim(),
      description: dto.description?.trim() ?? null,
      isActive: dto.isActive ?? true,
      questions: this.mapQuestions(dto.questions)
    });
  }

  public async updateForAdmin(user: AuthenticatedUser, id: string, dto: UpdateQuestionnaireDto) {
    this.assertManager(user);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }
    const existing = await this.repository.findById(id);
    if (existing === null) {
      throw new NotFoundException("Questionnaire not found");
    }
    return this.repository.replace(id, {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.questions !== undefined ? { questions: this.mapQuestions(dto.questions) } : {})
    });
  }

  public async seedDefaultIfEmpty(user: AuthenticatedUser) {
    this.assertManager(user);
    const catalogs = await this.catalogService.getFieldCatalogs();
    const questions = buildDefaultQuestionnaireQuestions({
      nestleProducts: catalogs.nestleProducts.map((item) => item.label),
      competitorBrands: catalogs.competitorBrands.map((item) => item.label),
      competitorProducts: competitorProductLabelsFromCatalog(catalogs.competitorProductsByBrand),
      vendorTypes: catalogs.vendorTypes.map((item) => item.label),
      sellerTypes: sellerTypeValues(catalogs.vendorTypeValuesByType).map((item) => item.label)
    });
    const existing = await this.repository.findByTitle(DEFAULT_QUESTIONNAIRE_TITLE);
    if (existing !== null) {
      return this.repository.replace(existing.id, {
        title: DEFAULT_QUESTIONNAIRE_TITLE,
        description: DEFAULT_QUESTIONNAIRE_DESCRIPTION,
        isActive: true,
        questions: this.mapQuestions(questions)
      });
    }
    return this.createForAdmin(user, {
      title: DEFAULT_QUESTIONNAIRE_TITLE,
      description: DEFAULT_QUESTIONNAIRE_DESCRIPTION,
      isActive: true,
      questions
    });
  }
}
