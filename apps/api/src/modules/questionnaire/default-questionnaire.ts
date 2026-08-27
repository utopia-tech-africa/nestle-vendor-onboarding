import type { CreateQuestionnaireDto } from "./dto/questionnaire.dto";
import { QuestionTypeDto as QuestionTypeEnum } from "./dto/questionnaire.dto";

export const DEFAULT_QUESTIONNAIRE_TITLE = "Nestlé vendor questionnaire";
export const DEFAULT_QUESTIONNAIRE_DESCRIPTION =
  "Market intelligence from the live Nestlé field questionnaire. Vendor profile, products, competitors, and items given are captured on the Add vendor form.";

export type DefaultQuestionnaireQuestion = NonNullable<CreateQuestionnaireDto["questions"]>[number];

/** Production field questionnaire, minus questions already collected on Add vendor. */
export const buildDefaultQuestionnaireQuestions = (): DefaultQuestionnaireQuestion[] => {
  return [
    {
      prompt: "Estimated number of customers in a day",
      helpText: "Typical number of customers at this stall in a day.",
      type: QuestionTypeEnum.number,
      required: true,
      sortOrder: 0
    },
    {
      prompt: "Busy selling period",
      type: QuestionTypeEnum.multi_choice,
      options: ["Morning", "Lunch", "Evening"],
      required: false,
      sortOrder: 1
    },
    {
      prompt: "Manual footfall count",
      helpText: "Optional count you did during this visit.",
      type: QuestionTypeEnum.number,
      required: false,
      sortOrder: 2
    },
    {
      prompt: "Interest in stocking Nestlé products",
      type: QuestionTypeEnum.single_choice,
      options: ["Yes", "No", "Maybe"],
      required: true,
      sortOrder: 3
    },
    {
      prompt: "Where do you buy your Nestlé products",
      type: QuestionTypeEnum.multi_choice,
      options: [
        "Distributor",
        "Supermarket",
        "Wholesale Shop",
        "Retail shop",
        "Mobile Vendor",
        "Non"
      ],
      required: true,
      sortOrder: 4
    },
    {
      prompt: "Challenges faced getting Nestlé products",
      type: QuestionTypeEnum.multi_choice,
      options: ["Unavailability", "Pricing", "Customer preferrence", "Non"],
      required: true,
      sortOrder: 5
    },
    {
      prompt: "Additional Comments",
      type: QuestionTypeEnum.textarea,
      required: false,
      sortOrder: 6
    }
  ];
};
