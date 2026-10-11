import { NextResponse } from "next/server";

/**
 * RFC 7807 Problem Details response builder.
 */
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export function problemResponse(problem: ProblemDetail): NextResponse {
  return NextResponse.json(problem, {
    status: problem.status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

export function validationError(
  errors: { field: string; message: string }[],
  correlationId?: string
): NextResponse {
  return problemResponse({
    type: "VALIDATION_ERROR",
    title: "Error de validacion",
    status: 422,
    correlationId,
    errors,
  });
}

export function notFound(resource: string, correlationId?: string): NextResponse {
  return problemResponse({
    type: "NOT_FOUND",
    title: `${resource} no encontrado`,
    status: 404,
    correlationId,
  });
}

export function unauthorized(detail?: string, correlationId?: string): NextResponse {
  return problemResponse({
    type: "UNAUTHORIZED",
    title: "No autorizado",
    status: 401,
    detail,
    correlationId,
  });
}

export function conflict(title: string, detail?: string, correlationId?: string): NextResponse {
  return problemResponse({
    type: "CONFLICT",
    title,
    status: 409,
    detail,
    correlationId,
  });
}

export function internalError(correlationId?: string): NextResponse {
  return problemResponse({
    type: "INTERNAL_ERROR",
    title: "Error interno del servidor",
    status: 500,
    correlationId,
  });
}
