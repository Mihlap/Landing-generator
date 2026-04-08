export type TemplateId = "dental" | "auto" | "repair" | "realestate" | "ecommerce";

export function isTemplateId(x: unknown): x is TemplateId {
  return x === "dental" || x === "auto" || x === "repair" || x === "realestate" || x === "ecommerce";
}
