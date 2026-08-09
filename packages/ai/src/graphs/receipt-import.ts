import { HumanMessage } from "@langchain/core/messages";

import { getModelForTask } from "../router";
import { receiptDraftSchema } from "../schemas/item-draft";

export async function runReceiptImportGraph(imageDataUrl: string) {
  const model = getModelForTask("vision").withStructuredOutput(receiptDraftSchema);

  return model.invoke([
    new HumanMessage({
      content: [
        {
          type: "text",
          text: "Extract every purchased line item from this receipt/invoice for a home inventory app: name, quantity, price, and the receipt's overall purchase date and merchant if visible. Skip subtotal/tax/total lines.",
        },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    }),
  ]);
}
