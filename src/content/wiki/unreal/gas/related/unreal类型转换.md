---
title: Unreal类型转换
description: 整理 Unreal 中 Cast、static_cast 与 Blueprint 参数修饰的差异。
tags: [Unreal, C++]
updated: 2025-05-02
---

## Cast

## static_cast
在编译时，静态转换

如果函数输入是一个非常量引用，通常意味着它是一个输出函数
```cpp
static void SetIsBlockedHit(FGameplayEffectContextHandle& EffectContextHandle, bool bInIsBlockedHit);
```
改为
```cpp
static void SetIsBlockedHit(UPARAM(ref) FGameplayEffectContextHandle& EffectContextHandle, bool bInIsBlockedHit);
```