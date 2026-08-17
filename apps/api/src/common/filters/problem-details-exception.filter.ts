import type { ArgumentsHost } from "@nestjs/common";
import { Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";

const PAYLOAD_TOO_LARGE_DETAIL =
  "The photo is too large. Retake with a smaller image or try again.";

type ErrorWithHttpMeta = {
  type?: string;
  status?: number;
  statusCode?: number;
  message?: string;
};

const isPayloadTooLargeError = (exception: unknown): boolean => {
  if (typeof exception !== "object" || exception === null) {
    return false;
  }
  const record = exception as ErrorWithHttpMeta;
  if (record.type === "entity.too.large") {
    return true;
  }
  if (record.status === 413 || record.statusCode === 413) {
    return true;
  }
  return exception instanceof Error && record.message === "request entity too large";
};

type PrismaKnownRequestErrorLike = {
  code: string;
  message: string;
  meta?: unknown;
};

const asPrismaKnownRequestError = (exception: unknown): PrismaKnownRequestErrorLike | null => {
  if (typeof exception !== "object" || exception === null) {
    return null;
  }
  if (!("code" in exception) || !("message" in exception)) {
    return null;
  }
  const record = exception as { code: unknown; message: unknown; meta?: unknown };
  if (typeof record.code !== "string" || typeof record.message !== "string") {
    return null;
  }
  return { code: record.code, message: record.message, meta: record.meta };
};

type ProblemDetailsError = {
  field?: string;
  message: string;
};

type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  errors?: ProblemDetailsError[];
};

type HttpRequestLike = {
  originalUrl: string;
};

type HttpResponseLike = {
  status: (statusCode: number) => {
    contentType: (value: string) => {
      json: (body: ProblemDetails) => void;
    };
  };
};

const prismaMetaModelName = (meta: unknown): string => {
  if (meta !== null && typeof meta === "object" && "modelName" in meta) {
    const modelName = meta.modelName;
    if (typeof modelName === "string") {
      return modelName;
    }
  }
  return "unknown";
};

@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsExceptionFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponseLike>();
    const request = context.getRequest<HttpRequestLike>();

    const status = this.resolveStatus(exception);
    const { detail, errors } = this.extractDetails(exception, status);

    const body: ProblemDetails = {
      type: this.buildTypeUri(status),
      title: this.getTitle(status),
      status,
      detail,
      instance: request.originalUrl,
      timestamp: new Date().toISOString(),
      ...(errors.length > 0 ? { errors } : {})
    };

    response.status(status).contentType("application/problem+json").json(body);
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    if (isPayloadTooLargeError(exception)) {
      return HttpStatus.PAYLOAD_TOO_LARGE;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private extractDetails(
    exception: unknown,
    status: number
  ): { detail: string; errors: ProblemDetailsError[] } {
    if (!(exception instanceof HttpException)) {
      if (status === 413 || isPayloadTooLargeError(exception)) {
        if (exception instanceof Error) {
          this.logger.warn(exception.message);
        }
        return { detail: PAYLOAD_TOO_LARGE_DETAIL, errors: [] };
      }

      const prismaError = asPrismaKnownRequestError(exception);
      if (prismaError !== null) {
        const prismaCode = prismaError.code;
        const prismaMessage = prismaError.message;
        this.logger.error(
          `Prisma ${prismaCode} on ${prismaMetaModelName(prismaError.meta)}: ${prismaMessage}`
        );
        if (prismaError.code === "P2028") {
          return {
            detail:
              "Saving took too long. Try again, use a smaller outlet photo, or contact your administrator if this keeps happening.",
            errors: []
          };
        }
        if (prismaError.code === "P2021" || prismaError.code === "P2022") {
          return {
            detail: "The server database is missing a required update. Contact your administrator.",
            errors: []
          };
        }
      } else if (exception instanceof Error) {
        this.logger.error(exception.message, exception.stack);
      }

      return {
        detail: "An unexpected error occurred.",
        errors: []
      };
    }

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === "string") {
      return { detail: exceptionResponse, errors: [] };
    }

    if (this.isHttpExceptionObject(exceptionResponse)) {
      const { message } = exceptionResponse;
      if (Array.isArray(message)) {
        const errors = message.map((item) => ({ message: item }));
        return {
          detail: "Validation failed.",
          errors
        };
      }

      if (typeof message === "string" && message.length > 0) {
        return { detail: message, errors: [] };
      }
    }

    return {
      detail: this.getTitle(status),
      errors: []
    };
  }

  private isHttpExceptionObject(value: unknown): value is { message?: string | string[] } {
    return typeof value === "object" && value !== null;
  }

  private buildTypeUri(status: number): string {
    return `https://httpstatuses.com/${String(status)}`;
  }

  private getTitle(status: number): string {
    return HttpStatus[status] ?? "Error";
  }
}
