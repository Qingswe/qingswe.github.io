---
title: RootMotion
description: Root Motion 与 Motion Warping 的基础概念。
tags: [unreal, wiki, animation, root-motion]
updated: 2025-05-09
---

## Root Motion 是什么

`Root Motion` 指的是动画里的根骨骼位移直接驱动角色移动，而不是角色原地播动作、再由代码去推位置。

典型场景：

- 冲刺攻击
- 翻滚
- 处决
- 带明显前冲位移的技能

## 为什么要用 Root Motion

如果动作位移完全由动画决定，可以得到：

- 更自然的脚步接地
- 动作与位移更一致
- 技能前冲、扑击、转身这类表现更准确

但代价是：

- 移动控制权更多交给动画
- 同步和调试会更复杂

## 开启方式

通常要确认两层：

1. 动画资源本身是否包含根骨骼位移
2. 动画蓝图 / 角色移动系统是否允许提取并应用 Root Motion

项目里常见是：

- 普通移动用速度驱动
- 技能蒙太奇用 Root Motion

## 和 Motion Warping 的关系

`Motion Warping` 不是 Root Motion 的替代，而是它的增强版工作流。

可以这样理解：

- `Root Motion`：动画自己提供位移轨迹
- `Motion Warping`：在保留动画运动感的前提下，把这段位移“对齐到目标”

比如：

- 处决时自动对准敌人
- 冲刺技能自动落到命中点
- 跳跃落点根据目标微调

## 网络同步注意项

Root Motion 在多人项目里要更谨慎，因为角色位移不再完全由常规输入模拟。

常见注意点：

- 尽量由服务端决定关键位移结果
- 技能型 Root Motion 常和 Montage、Ability 系统一起管理
- 如果客户端和服务端提取位移不一致，容易出现拉扯和回弹

所以 Root Motion 很适合“关键动作驱动”，但不一定适合所有基础移动。

## 使用经验

- 普通跑跳循环一般仍然优先非 Root Motion 驱动
- 冲刺、扑击、近战技能很适合用 Root Motion
- 一旦引入 Motion Warping，就要明确“目标点来自哪里、何时锁定”
- 角色飘移、落点不准，先检查动画根骨骼数据，再检查运行时配置