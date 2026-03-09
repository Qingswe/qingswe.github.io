---
title: Pawn 概述
description: 虚幻引擎中代表玩家或 AI 在世界中的可控实体。
tags: [unreal, wiki, core-concept, pawn, ai, player-control]
updated: 2025-05-06
---

# Pawn 概述

【重点】**Pawn** 是 `Actor` 的一个子类，代表游戏世界中的一个**可被控制的代理（Agent）**。它充当玩家或人工智能（AI）在游戏环境中的化身或实体。Pawn 可以被 **控制器（Controller）** 所"拥有（Possess）"和控制。

## 核心特性

*   **继承自 Actor**: 【重点】Pawn 继承了 Actor 的所有基本功能，包括拥有 Transform、组件、生命周期事件等。
*   **可被控制 (Controllable)**: 【重点】Pawn 设计的核心在于它可以被 `Controller`（`PlayerController` 或 `AIController`）控制。这种**控制器-Pawn分离**的设计是 Unreal 架构的关键之一，它允许：
    *   同一个 Pawn 可以被玩家或 AI 控制。
    *   玩家或 AI 可以在不同的 Pawn 之间切换控制权（例如，从控制角色切换到控制载具）。
    *   【技巧】在 Pawn 死亡或销毁时，控制器可以保持存在，并可能控制一个新的 Pawn。
*   **接收输入**: Pawn 可以被设置为接收玩家的输入。
*   **移动**: 【技巧】Pawn 通常需要移动能力。虽然 Pawn 基类本身不直接提供复杂的移动逻辑，但通常会配合 `MovementComponent`（尤其是 `CharacterMovementComponent` 或 `FloatingPawnMovement`）来实现移动。
*   **AI**: AI 控制的实体通常使用 Pawn 作为其在世界中的表现形式，由 `AIController` 驱动。

## 与其他概念的关系

*   **Actor**: 【重点】Pawn 是 Actor 的子类。所有 Pawn 都是 Actor，但并非所有 Actor 都是 Pawn。
*   **Controller**: 【重点】`Controller` 是负责"思考"和发出指令的实体，而 `Pawn` 是执行这些指令的"身体"。`Controller` 通过 `Possess()` 函数拥有 Pawn，通过 `UnPossess()` 函数解除拥有。
	*   **[[w/unreal/character|Character]]**: 【技巧】`Character` 是 Pawn 的一个常用子类，它预设了用于人形角色的功能，包括 `CharacterMovementComponent`（提供行走、跳跃、游泳、飞行等复杂移动模式）和 `CapsuleComponent`（用于碰撞）以及 `SkeletalMeshComponent`（用于显示骨骼动画）。对于大多数玩家角色和人形 AI，通常会选择 Character 作为基类。

## 应用场景【例子】

*   玩家控制的角色
*   AI 控制的敌人或 NPC
*   可驾驶的载具
*   任何需要被玩家或 AI 直接控制的游戏内实体

## 工程师思维框架

*   **问题定义**: 如何在游戏中创建一个可以被玩家或 AI 控制的实体，并将其控制逻辑与实体本身分离？
*   **原理分析**: 使用继承自 `Actor` 的 `Pawn` 类作为受控实体，并引入 `Controller` 类负责控制逻辑。
*   **解决方案**: 创建 `Pawn` 或其子类（如 `Character`）的蓝图或 C++ 类。创建对应的 `PlayerController` 或 `AIController`。在游戏逻辑中，让 Controller `Possess` 合适的 Pawn。
*   **优化迭代**:
    *   【注意】根据实体需求选择合适的移动组件，避免使用过于复杂的组件（例如，简单的漂浮物不需要 `CharacterMovementComponent`）。
    *   【技巧】利用 Controller 和 Pawn 的分离，可以方便地实现如灵魂出窍、远程控制、AI接管玩家角色等功能。
*   **经验总结**: Pawn 是连接控制逻辑 (Controller) 和世界表现 (Actor) 的桥梁，理解 Pawn-Controller 架构对于开发可交互角色至关重要。