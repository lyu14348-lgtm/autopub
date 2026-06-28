import { getAiCost, runAiTask } from "../../packages/ai/provider.js";
import { completeAiTask, isMockMode, spendCreditsForAiTask } from "../../packages/db/supabase.js";
import { getRequestUser, method, readJson, sendJson } from "../_utils.js";

export default async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  try {
    const user = await getRequestUser(req);
    const body = await readJson(req);
    if (!body.task_type) {
      sendJson(res, 400, { error: "task_type is required." });
      return;
    }
    const input = body.input || {};
    let taskRecord = null;
    let taskUser = user;
    if (!isMockMode()) {
      taskRecord = await spendCreditsForAiTask({
        userId: user.user_id,
        taskType: body.task_type,
        input,
        cost: getAiCost(body.task_type)
      });
      taskUser = { ...user, credits_balance: taskRecord.credits_balance };
    }
    const result = await runAiTask({
      user: taskUser,
      taskType: body.task_type,
      input,
      chargeCredits: isMockMode()
    });
    if (!result.ok) {
      if (taskRecord?.ai_task_id) {
        await completeAiTask({
          taskId: taskRecord.ai_task_id,
          status: "failed",
          failureReason: result.error
        });
      }
      sendJson(res, 402, { error: result.error });
      return;
    }
    if (taskRecord?.ai_task_id) {
      await completeAiTask({
        taskId: taskRecord.ai_task_id,
        status: "completed",
        output: result.output
      });
    }
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 401, { error: error.message });
  }
}
