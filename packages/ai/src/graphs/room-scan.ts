import { HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";

import { getStructuredModelForTask } from "../router";
import { roomScanDraftSchema } from "../schemas/item-draft";

/**
 * Vision extraction for a room/space photo: identifies every distinct item
 * visible, with bounding-box coordinates and confidence levels. The caller
 * (room-scan UI) lets the user review, edit, and deselect before importing.
 */
export async function runRoomScanGraph(imageDataUrl: string, config?: RunnableConfig) {
  const model = getStructuredModelForTask("vision", roomScanDraftSchema);

  return model.invoke(
    [
      new HumanMessage({
        content: [
          {
            type: "text",
            text: `You are analysing a photo of a room, shelf, drawer or storage space for a home inventory app.

Identify every distinct physical item visible in the photo (up to 20 items). For each item report:
- A short, recognisable name (e.g. "Ride-on mower", "18V drill kit")
- A brief visual description (colour, size, distinguishing features)
- Quantity if multiples are visible
- A best-guess category/label (e.g. "Power tools", "Garden")
- Where in the space it appears to be (e.g. "Pegboard", "Shelf", "Workbench")
- Confidence: "high" if clearly identifiable, "medium" if partially obscured, "unsure" if hard to tell
- A bounding box as percentage coordinates (x, y from top-left corner; w, h as width/height) — all values 0-100 representing the percentage of image dimensions

Also suggest a name for the space itself (e.g. "Garage", "Kitchen pantry", "Garden shed").

Focus on items a homeowner would want to inventory — skip walls, floors, ceilings, and fixtures unless they're removable.`,
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      }),
    ],
    config,
  );
}
