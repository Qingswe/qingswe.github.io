---
title: UPROPERTY
description: UPROPERTY 常用说明符与反射暴露规则。
tags: [Unreal, C++]
updated: 2025-11-27
---

## 说明符
- EditAnywhere
- BlueprintReadWrite
- Category

## 先记住一件事

`UPROPERTY` 不只是“让字段显示到编辑器里”，它同时参与：

- 反射
- 序列化
- 垃圾回收引用跟踪
- 蓝图暴露
- 复制、存档等扩展系统

对于 `UObject` 指针成员，如果它需要被引擎正确追踪，通常要通过 `UPROPERTY` 暴露给反射系统。

## 编辑器可见性

最常见的是下面几组：

- `VisibleAnywhere`：可见不可改
- `EditAnywhere`：默认值和实例都可改
- `EditDefaultsOnly`：只改类默认值，不改实例
- `EditInstanceOnly`：只改场景实例，不改类默认值

经验上：

- 组件引用常用 `VisibleAnywhere`
- 设计参数常用 `EditAnywhere` 或 `EditDefaultsOnly`

## 蓝图暴露

- `BlueprintReadOnly`：蓝图可读
- `BlueprintReadWrite`：蓝图可读可写

如果字段只想在蓝图里读，不想被随意改，优先 `BlueprintReadOnly`。

## 常见辅助说明符

- `Category = "Combat"`：在细节面板和蓝图里分组
- `Transient`：运行时临时数据，不参与持久化
- `SaveGame`：允许存档系统保存
- `Instanced`：对象实例作为内联子对象持有
- `meta = (AllowPrivateAccess = "true")`：私有字段也能暴露给蓝图访问

## 常见组合

### 组件引用

```cpp
UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
TObjectPtr<USkeletalMeshComponent> MeshComponent;
```

### 设计参数

```cpp
UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Combat")
float AttackRange = 300.f;
```

### 运行时状态

```cpp
UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "State")
bool bIsDead = false;
```

## 一个容易混淆的点

`BlueprintCallable` 是给 `UFUNCTION` 用的，不是给 `UPROPERTY` 用的。

属性和函数分属两套宏：

- 字段用 `UPROPERTY`
- 函数用 `UFUNCTION`

## UE5 指针习惯

在 UE5 中，很多 `UObject` 引用字段推荐写成 `TObjectPtr<T>` 再配合 `UPROPERTY`，这样更符合当前引擎的对象引用约定。

## 经验总结

- 想让设计师调参数，就先想 `EditDefaultsOnly` 还是 `EditAnywhere`
- 想防止乱改，优先只读
- 只要字段持有 `UObject` 引用，先确认是否需要 `UPROPERTY`
- “编辑器看不见 / 蓝图读不到 / 对象被 GC 回收” 这三类问题，经常都和 `UPROPERTY` 配置有关