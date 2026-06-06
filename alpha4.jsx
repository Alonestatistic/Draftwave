/* ============================================================
   Draftwave - Alpha 4 tester feedback and stop-ship gates
   ============================================================ */

import {
  ALPHA4_PHASE,
  ALPHA4_TEST_WORKFLOWS,
  DATA_LOSS_STOP_SHIP_AREAS,
  buildAlpha4FeedbackReport,
  evaluateAlpha4StopShip,
} from "./src/alpha4Gates.js";

const Alpha4 = {
  phase:ALPHA4_PHASE,
  workflows:ALPHA4_TEST_WORKFLOWS,
  stopShipAreas:DATA_LOSS_STOP_SHIP_AREAS,
  buildTesterFeedbackReport:buildAlpha4FeedbackReport,
  evaluateStopShip:evaluateAlpha4StopShip,
};

Object.assign(window, { Alpha4 });
