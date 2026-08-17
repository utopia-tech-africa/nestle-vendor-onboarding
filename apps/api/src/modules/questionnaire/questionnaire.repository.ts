import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class QuestionnaireRepository {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public findAll() {
    return this.prisma.questionnaire.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        questions: { orderBy: { sortOrder: "asc" } }
      }
    });
  }

  public findActiveForField() {
    return this.prisma.questionnaire.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" }
        }
      }
    });
  }

  public findById(id: string) {
    return this.prisma.questionnaire.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { sortOrder: "asc" } }
      }
    });
  }

  public findByTitle(title: string) {
    return this.prisma.questionnaire.findFirst({
      where: { title },
      include: {
        questions: { orderBy: { sortOrder: "asc" } }
      }
    });
  }

  public create(data: {
    title: string;
    description: string | null;
    isActive: boolean;
    questions: {
      prompt: string;
      helpText: string | null;
      type: "text" | "textarea" | "number" | "single_choice" | "multi_choice" | "boolean";
      optionsJson: string | null;
      required: boolean;
      sortOrder: number;
      isActive: boolean;
    }[];
  }) {
    return this.prisma.questionnaire.create({
      data: {
        title: data.title,
        description: data.description,
        isActive: data.isActive,
        questions: { create: data.questions }
      },
      include: {
        questions: { orderBy: { sortOrder: "asc" } }
      }
    });
  }

  public async replace(id: string, data: {
    title?: string;
    description?: string | null;
    isActive?: boolean;
    questions?: {
      prompt: string;
      helpText: string | null;
      type: "text" | "textarea" | "number" | "single_choice" | "multi_choice" | "boolean";
      optionsJson: string | null;
      required: boolean;
      sortOrder: number;
      isActive: boolean;
    }[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      if (data.questions !== undefined) {
        await tx.questionnaireQuestion.deleteMany({ where: { questionnaireId: id } });
      }
      return tx.questionnaire.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.questions !== undefined
            ? { questions: { create: data.questions } }
            : {})
        },
        include: {
          questions: { orderBy: { sortOrder: "asc" } }
        }
      });
    });
  }

  public countResponses(from?: Date, to?: Date) {
    return this.prisma.questionnaireResponse.count({
      where: {
        ...(from !== undefined || to !== undefined
          ? {
              submittedAt: {
                ...(from !== undefined ? { gte: from } : {}),
                ...(to !== undefined ? { lte: to } : {})
              }
            }
          : {})
      }
    });
  }
}
