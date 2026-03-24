import type { Alpine } from "alpinejs";
import { createFeedbackStore } from "./store/app";

export default function initAlpine(Alpine: Alpine) {
  Alpine.store("feedbackApp", createFeedbackStore());
}
