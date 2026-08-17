/** Max decoded image size allowed by attendance/outlet photo validators (5 MiB). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * JSON body limit for Express. Base64 adds ~33%; keep headroom above {@link MAX_IMAGE_BYTES}.
 */
export const JSON_BODY_LIMIT = "10mb";
