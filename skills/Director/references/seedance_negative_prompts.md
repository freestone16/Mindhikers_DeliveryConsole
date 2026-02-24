# Seedance 2.0 Negative Prompts

> **用途**: 在生成 API 调用或 Prompt 构建时，强制附加的负面提示词，以保证画面纯净度。

## 1. 通用负面 (Universal Clean-up)
> **适用**: 所有场景，默认开启。

```text
watermark, text, username, logo, signature, timestamp, bad quality, low resolution, blurry, pixelated, noise, artifacts, cropping, out of frame
```

## 2. 人物负面 (Character Safety)
> **适用**: 涉及人物生成的场景。

```text
deformed hands, extra fingers, missing limbs, bad anatomy, distorted face, mutation, zombie, ugly, cross-eyed, extra limbs, fused fingers, too many fingers, long neck
```

## 3. 风格修正 (Style Correction)
> **适用**: 防止画风跑偏。

- **去卡通化 (For Realism)**: `cartoon, anime, illustration, drawing, painting, 3d render, sketch`
- **去写实化 (For Anime)**: `photorealistic, realistic, photograph, 3d, cgi`

## 4. MindHikers 特定禁忌
> **适用**: 频道价值观红线。

```text
blood, gore, violence, nudity, disturbing content, rotting flesh, horror (unless specified), dark content
```
