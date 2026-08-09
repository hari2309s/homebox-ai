import { HumanMessage } from "@langchain/core/messages";

import { getModelForTask } from "../router";
import { itemDraftSchema } from "../schemas/item-draft";

/**
 * Single-shot vision extraction: photo in, item draft out. Kept as its own
 * function (rather than a multi-node StateGraph) since v1 has no follow-up
 * step — a future critique/verification node can be added here without
 * changing the caller's contract.
 */
export async function runPhotoToItemGraph(imageDataUrl: string) {
  const model = getModelForTask("vision").withStructuredOutput(itemDraftSchema);

  return model.invoke([
    new HumanMessage({
      content: [
        {
          type: "text",
          text: "Identify the single most prominent item in this photo for a home inventory app. Suggest a concise name, short description, a likely label/category, and a likely storage location if inferable from the surroundings.",
        },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    }),
  ]);
}
