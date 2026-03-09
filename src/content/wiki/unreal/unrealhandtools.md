---
title: UnrealHandTools
description: 虚幻热重载相关工具产物的存放位置。
tags: [Unreal]
updated: 2025-06-10
---

## 这里在记什么

这个名字我这里按 **Unreal Header Tool / 热重载工具链相关产物** 来理解。

它的核心不是运行时系统，而是 Unreal 的编译前处理流程：

- 扫描 `UCLASS` / `USTRUCT` / `UFUNCTION` / [[w/unreal/uproperty|UPROPERTY]]
- 生成 `.generated.h` 和相关反射代码
- 让编辑器、蓝图、序列化、GC 都能识别这些类型

## 它什么时候触发

通常在这些场景会介入：

- 新建带反射宏的 C++ 类
- 修改 `UCLASS` / `USTRUCT` / `UFUNCTION` / `UPROPERTY` 声明
- 编译项目或由编辑器触发代码编译

也就是说，只要改到了反射层定义，就不只是“普通 C++ 编译”，而是会先经过这套工具链。

## 和 Intermediate 的关系

反射生成的中间文件、编译过程产物，大量都会出现在 [[w/unreal/虚幻文件夹管理#Intermediate|Intermediate]] 目录中。

这也是为什么：

- `Intermediate` 通常不提交版本控制
- 删除后重新编译，很多问题会被“重建”掉

## 和热重载 / Live Coding 的关系

热重载或 `Live Coding` 更像是“尽量在编辑器运行中替换编译结果”，但它并不能绕过反射生成这一步。

经验上要注意：

- 只改普通函数体，`Live Coding` 往往比较顺
- 改 `UCLASS` 字段、函数签名、组件层级这类反射结构时，更容易出问题
- 一旦出现蓝图异常、属性丢失、类型不同步，往往要关闭编辑器后完整编译

## 实践结论

- 看到 `.generated.h`、中间产物、反射报错，本质都和这套工具链有关
- 改“声明”比改“实现”更敏感
- 遇到诡异编译问题时，可以先清理 `Intermediate` 再完整重编