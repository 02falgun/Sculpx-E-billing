import { z } from "zod";

export const checkoutFormSchema = z.object({
  customerName: z.string().trim().max(100).optional(),
  customerPhone: z
    .string()
    .trim()
    .regex(/^$|^[0-9]{10}$/, "Phone number must be 10 digits")
    .optional(),
  specialInstructions: z.string().trim().max(300, "Maximum 300 characters").optional(),
  paymentPreference: z.enum(["PAY_NOW", "PAY_LATER"], {
    errorMap: () => ({ message: "Select payment preference" }),
  }),
});

export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;
