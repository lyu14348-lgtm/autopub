import { spendCredits } from "../credits/credits.js";

import http from "node:http";
import https from "node:https";

/*
 * AI task cost registry.
 * V1 active: visual_prompt, image_generation, video_analysis, seo_fix, competitor_summary
 */
const COSTS = {
  visual_prompt: 2,
  image_generation: 8,
  video_analysis: 4,
  seo_fix: 3,
  competitor_summary: 3,
  style_transfer: 5,
};

function buildSystemPrompt(taskType) {
  switch (taskType) {
    case "visual_prompt":
      return "You are a visual reverse-prompt specialist. Your job is to preserve the source image's visual language, medium, style category, composition, lighting, palette, texture, and mood. Produce prompts for faithful style-consistent generation, not unrelated reinterpretations.";
    case "video_analysis":
      return "You are a short-form video creative strategist. Based on the video information, break down: 1) opening hook, 2) pacing structure, 3) core selling points, 4) emotional triggers, and 5) call to action. Support the analysis with examples from the source material when available.";
    case "seo_fix":
      return "You are an SEO expert. Based on the page audit report, provide concrete fixes for each issue, including recommended title and meta description copy where relevant. Sort recommendations by severity from P1 to P2.";
    case "competitor_summary":
      return "You are a competitive intelligence analyst. Based on the before-and-after comparison of a competitor page, summarize what changed, infer the likely strategy behind the changes, and provide concise, insightful response recommendations.";
    case "style_transfer":
      return "You are a product style transfer specialist. Based on a product photo and a target style description, generate a new image that keeps the product identity but applies the target style. Keep product shape, key features intact. Only change visual style, background, lighting and mood.";
    case "image_generation":
      return "You are an AI image generation specialist. Follow STYLE LOCK and MEDIUM LOCK precisely. Preserve the stated source style family and medium exactly. Never convert anime, manga, illustration, cartoon, UI graphics, screenshots, posters, 3D renders, or product photos into another medium unless explicitly requested.";
    default:
      return "You are a growth marketing assistant. Analyze the input and provide concise, actionable recommendations.";
  }
}

function stringifyInput(input) {
  return typeof input === "string" ? input : JSON.stringify(input);
}

function buildImagePrompt(input) {
  if (typeof input === "string") return input;
  if (input?.prompt) return input.prompt;
  if (input?.style_description) {
    return [
      "Create a polished product image based on the provided source product.",
      "Preserve the product identity, silhouette, materials, and key details.",
      "Apply this target style: " + input.style_description + ".",
      "Return a commercially usable, high-quality image."
    ].join(" ");
  }
  if (input?.instruction) {
    return input.instruction + "\n\nSource context:\n" + JSON.stringify(input.source_images || input.images || {}, null, 2);
  }
  return stringifyInput(input || {});
}

function getInputImageDataUrl(input) {
  return input?.image?.data_url
    || input?.image?.source_url
    || input?.image?.url
    || input?.image?.src
    || input?.image_data_url
    || input?.source_url
    || input?.data_url
    || null;
}

function isRemoteImageUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function getImageMimeType(url, contentType) {
  if (/image\/(png|jpe?g|webp|gif)/i.test(contentType || "")) return contentType.split(";")[0].toLowerCase();
  const clean = String(url || "").split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

async function fetchImageAsDataUrl(url) {
  const parsed = new URL(url);
  const client = parsed.protocol === "http:" ? http : https;
  const referer = parsed.origin + "/";
  const result = await new Promise((resolve, reject) => {
    const request = client.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 AutoPub Visual Analyzer",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Referer": referer
      }
    }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        const nextUrl = new URL(response.headers.location, url).href;
        fetchImageAsDataUrl(nextUrl).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error("Image fetch returned status " + response.statusCode));
        return;
      }
      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        size += chunk.length;
        if (size > 8 * 1024 * 1024) {
          request.destroy(new Error("Image is larger than 8MB."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        resolve({
          buffer: Buffer.concat(chunks),
          contentType: response.headers["content-type"] || ""
        });
      });
    });
    request.on("timeout", () => request.destroy(new Error("Image fetch timed out.")));
    request.on("error", reject);
  });
  if (typeof result === "string" && result.startsWith("data:image/")) return result;
  return "data:" + getImageMimeType(url, result.contentType) + ";base64," + result.buffer.toString("base64");
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function collectImageUrls(output) {
  const urls = [];
  const add = (value) => {
    if (typeof value === "string" && /^(https?:\/\/|data:image\/)/i.test(value)) urls.push(value);
  };
  for (const result of output?.results || []) add(result.url);
  for (const result of output?.results || []) add(result.image_url);
  for (const result of output?.results || []) add(result.output_url);
  add(output?.url);
  add(output?.image_url);
  add(output?.output_url);
  for (const choice of output?.choices || []) {
    const content = choice?.message?.content;
    if (Array.isArray(content)) {
      for (const item of content) add(item.image || item.url);
    }
  }
  return [...new Set(urls)];
}

async function runImageGeneration({ apiKey, input }) {
  const baseUrl = (process.env.AI_IMAGE_PROVIDER_BASE_URL || "https://dashscope.aliyuncs.com/api/v1").replace(/\/$/, "");
  const model = process.env.AI_IMAGE_PROVIDER_MODEL || "wan2.7-image-pro";
  const size = process.env.AI_IMAGE_PROVIDER_SIZE || "2K";
  const prompt = buildImagePrompt(input);
  const refImage = input && (input.ref_image || input.image_data_url || (input.image && input.image.data_url)) || null;
  const useStyleReference = Boolean(refImage && ["style_reference", "style_series", "style_variation"].includes(input?.reference_mode));
  const useSequentialReference = Boolean(refImage && input?.reference_mode === "style_series");
  const useImageEditVariation = Boolean(refImage && input?.reference_mode === "style_variation");
  const content = refImage
    ? (useSequentialReference
        ? [
            { text: prompt },
            { image: refImage }
          ]
        : [
            { image: refImage },
            { text: prompt }
          ])
    : [
        { text: prompt }
      ];
  const parameters = {
    size,
    n: 1,
    watermark: false
  };
  if (useImageEditVariation) parameters.prompt_extend = false;
  if (useSequentialReference) parameters.enable_sequential = true;
  const servicePath = refImage ? "/services/aigc/multimodal-generation/generation" : "/services/aigc/image-generation/generation";
  const requestBody = {
    model,
    input: {
      messages: [
        {
          role: "user",
          content
        }
      ]
    },
    parameters
  };
  const requestGeneration = async (asyncMode) => {
    const headers = {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    };
    if (asyncMode) headers["X-DashScope-Async"] = "enable";
    const response = await fetch(baseUrl + servicePath, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });
    const body = await response.json();
    return { response, body };
  };

  let { response, body: created } = await requestGeneration(true);
  if (!response.ok) {
    const errorText = created.message || created.error?.message || created.code || "";
    if (/does not support asynchronous calls|not support asynchronous|asynchronous/i.test(errorText)) {
      ({ response, body: created } = await requestGeneration(false));
    }
  }

  if (!response.ok) {
    throw new Error(created.message || created.error?.message || created.code || "Image provider returned status " + response.status);
  }

  const immediateImageUrls = collectImageUrls(created?.output || created);
  if (immediateImageUrls.length) {
    return {
      model,
      prompt,
      taskId: created.output?.task_id || created.task_id || null,
      images: immediateImageUrls,
      raw: created?.output || created
    };
  }

  const taskId = created.output?.task_id || created.task_id;
  if (!taskId) throw new Error("Image provider did not return a task id.");

  let task = null;
  for (let attempt = 0; attempt < 45; attempt++) {
    await sleep(2000);
    const taskResponse = await fetch(baseUrl + "/tasks/" + encodeURIComponent(taskId), {
      headers: { "Authorization": "Bearer " + apiKey }
    });
    task = await taskResponse.json();
    if (!taskResponse.ok) {
      throw new Error(task.message || task.error?.message || task.code || "Image task polling failed.");
    }
    const status = task.output?.task_status || task.task_status || task.status;
    if (status === "SUCCEEDED") break;
    if (["FAILED", "CANCELED", "UNKNOWN"].includes(status)) {
      throw new Error(task.output?.message || task.message || "Image generation task " + status.toLowerCase() + ".");
    }
  }

  const imageUrls = collectImageUrls(task?.output);
  if (!imageUrls.length) throw new Error("Image generation finished but no image URL was returned.");
  return {
    model,
    prompt,
    taskId,
    images: imageUrls,
    raw: task?.output
  };
}

async function runVisualPromptWithImage({ apiKey, providerUrl, input }) {
  const model = process.env.AI_VISION_PROVIDER_MODEL || "qwen-vl-plus";
  const imageUrl = getInputImageDataUrl(input);
  if (!imageUrl) throw new Error("No image data was provided for visual prompt analysis.");
  const instruction = input?.instruction || "Reverse-engineer this image into a practical image-generation prompt. Describe subject, composition, style, lighting, color palette, mood, and aspect ratio. Output one clean prompt the user can copy.";
  const requestVision = async (url) => fetch(providerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKey
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instruction },
            { type: "image_url", image_url: { url } }
          ]
        }
      ],
      max_tokens: 1400,
      temperature: 0.2
    })
  });

  let response = await requestVision(imageUrl);
  let data = await response.json();
  if (!response.ok && isRemoteImageUrl(imageUrl)) {
    const errorText = data.error?.message || data.message || data.code || "";
    if (/download|timed out|multimodal|invalidparameter|invalid parameter/i.test(errorText)) {
      let dataUrl;
      try {
        dataUrl = await fetchImageAsDataUrl(imageUrl);
      } catch (fetchError) {
        throw new Error("The AI provider could not download this image, and AutoPub could not proxy it either: " + (fetchError.message || "image fetch failed"));
      }
      response = await requestVision(dataUrl);
      data = await response.json();
    }
  }
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || data.code || "Vision provider returned status " + response.status);
  }
  const prompt = data.choices?.[0]?.message?.content || "No response content received.";
  return {
    model: data.model || model,
    prompt,
    usage: data.usage
  };
}

async function buildStyleTransferPrompt({ apiKey, providerUrl, input }) {
  const imageUrl = getInputImageDataUrl(input);
  if (!imageUrl) {
    return buildImagePrompt(input);
  }

  const model = process.env.AI_VISION_PROVIDER_MODEL || "qwen-vl-plus";
  const styleDescription = input?.style_description || "premium studio product photography";
  const response = await fetch(providerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKey
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this product image and write one image-generation prompt that preserves the product identity, shape, materials, and recognizable details while applying this target style: " + styleDescription + ". Include background, lighting, camera framing, and finish. Output only the final prompt."
            },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 700,
      temperature: 0.4
    })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || data.code || "Vision provider returned status " + response.status);
  }
  return data.choices?.[0]?.message?.content || buildImagePrompt(input);
}

export function getAiCost(taskType) {
  return COSTS[taskType] ?? 1;
}

export async function runAiTask({ user, taskType, input, chargeCredits = true }) {
  const cost = getAiCost(taskType);
  let spend = { ok: true, user };
  if (chargeCredits) {
    spend = spendCredits(user, cost, taskType);
    if (!spend.ok) {
      return { ok: false, error: spend.reason };
    }
  }

  const apiKey = process.env.AI_PROVIDER_API_KEY;
  if (!apiKey) {
    const mockGeneratedSvg = "<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024' viewBox='0 0 1024 1024'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0' stop-color='#eaf7ff'/><stop offset='1' stop-color='#b8dcff'/></linearGradient></defs><rect width='1024' height='1024' fill='url(#g)'/><circle cx='700' cy='280' r='180' fill='rgba(0,122,255,0.28)'/><rect x='250' y='330' width='524' height='360' rx='70' fill='rgba(255,255,255,0.72)' stroke='rgba(0,0,0,0.08)'/><text x='512' y='535' text-anchor='middle' font-family='Arial' font-size='38' fill='#1f2937'>Mock Generated Image</text></svg>";
    const mockVisualPrompt = "Premium product-style image, clean futuristic composition, soft glass lighting, sharp subject detail, cool blue-white palette, minimal background, commercial hero image, high-end Apple-inspired aesthetic.";
    return {
      ok: true, cost,
      user: spend.user,
      output: {
        taskType,
        summary: taskType === "visual_prompt"
          ? mockVisualPrompt
          : "Mock AI result for " + taskType + ". Set AI_PROVIDER_API_KEY in .env to connect Alibaba Cloud Bailian. Default endpoint: dashscope.aliyuncs.com, model: qwen-plus.",
        prompt: taskType === "visual_prompt" ? mockVisualPrompt : buildImagePrompt(input),
        images: taskType === "image_generation"
          ? ["data:image/svg+xml;utf8," + encodeURIComponent(mockGeneratedSvg)]
          : undefined,
        input
      }
    };
  }

  // Alibaba Cloud Bailian OpenAI-compatible endpoint
  const providerUrl = process.env.AI_PROVIDER_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
  const model = process.env.AI_PROVIDER_MODEL || "qwen-plus";

  try {
    if (taskType === "visual_prompt" && getInputImageDataUrl(input)) {
      const visual = await runVisualPromptWithImage({ apiKey, providerUrl, input });
      return {
        ok: true, cost,
        user: spend.user,
        output: {
          taskType,
          summary: visual.prompt,
          prompt: visual.prompt,
          model: visual.model,
          usage: visual.usage,
          input: {
            image: {
              width: input?.image?.width || null,
              height: input?.image?.height || null,
              source: input?.image?.source || null
            }
          }
        }
      };
    }

    if (taskType === "style_transfer" || taskType === "image_generation") {
      const generationInput = taskType === "style_transfer"
        ? { ...input, prompt: await buildStyleTransferPrompt({ apiKey, providerUrl, input }) }
        : input;
      const generated = await runImageGeneration({ apiKey, input: generationInput });
      return {
        ok: true, cost,
        user: spend.user,
        output: {
          taskType,
          summary: "Generated " + generated.images.length + " image" + (generated.images.length === 1 ? "" : "s") + " with Alibaba Cloud Bailian. Image URLs may expire, so download the result you want to keep.",
          model: generated.model,
          prompt: generated.prompt,
          images: generated.images,
          taskId: generated.taskId,
          input: generationInput
        }
      };
    }

    const response = await fetch(providerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: buildSystemPrompt(taskType) },
          { role: "user", content: stringifyInput(input) }
        ],
        max_tokens: 800,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || data.message || data.code || "Provider returned status " + response.status);
    }

    return {
      ok: true, cost,
      user: spend.user,
      output: {
        taskType,
        summary: data.choices?.[0]?.message?.content || "No response content received.",
        model: data.model || model,
        usage: data.usage,
        input
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: "AI provider error: " + (error.message || "Unknown error"),
      user: spend.user
    };
  }
}
