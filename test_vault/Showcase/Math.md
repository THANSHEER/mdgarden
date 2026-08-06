---
title: Math
description: KaTeX-rendered inline and block math
tags: [showcase, math]
---

# Math

Math is rendered with [KaTeX](https://katex.org/), fully self-hosted
(fonts included in the build output — no CDN, no runtime download).

## Inline

The reading-time estimate is $t = \lceil w / 200 \rceil$ minutes, where
$w$ is the word count.

## Block

$$
\text{cosine similarity} = \frac{A \cdot B}{\lVert A \rVert \, \lVert B \rVert}
$$

The graph view lays out notes with a force-directed simulation:

$$
F_{ij} = k \frac{q_i q_j}{r_{ij}^2} \qquad
\text{(repulsion between unconnected nodes } i, j\text{)}
$$

$$
\sum_{i=1}^{n} \left( x_i - \bar{x} \right)^2 = \text{variance} \times n
$$

> [!note] Disabling math
> `mdgarden config set features.math false` skips loading KaTeX's CSS and
> fonts entirely for vaults that don't need it.
