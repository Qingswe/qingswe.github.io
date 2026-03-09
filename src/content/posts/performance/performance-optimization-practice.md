---
title: 性能优化实战
published: 2025-02-20
description: '记录一次 Unity 性能优化实战中常见瓶颈与 GPU 优化方法。'
tags: [unity, performance, profiling, review]
category: Unity Engine
draft: false
---
## Unity下常见的等待函数
`WaitForTargetFPS`：等待达到目标帧率，一般这种情况CPU与GPU都没什么负载问题
`Gfx.WaitForGfxCommandsFromMainThread/WaitForCommand`：渲染线程已经准备接受新的渲染命令，一般瓶颈在CPU
`Gfx.WaitForPresentOnGfxThread/WaitForPresent`: 主线程等待渲染线程绘制完成，一般瓶颈在GPU
`WaitForJobGroupID`：等待工作线程完成，一般瓶颈在CPU

不根据性能报告直接进行优化，把这些当作性能状况的了解，方便后面我们在优化以后与之前的结果进行对比
## 如何优化GPU瓶颈
- 渲染流程与效果优化
- 渲染中生成资源优化
- DrawCall与SetPassCall
- 片元着色器
- 渲染三角形
## 示例项目 延迟渲染流程
![](/images/performance/性能优化实战.png)

## 如何查看优化移动端渲染
使用XCode中的Metal 来进行渲染debug

任何超过1毫秒的渲染步骤都是值得我们关注的，将gpu 一帧的耗时控制在10毫秒之内比较合理
 
## SSAO优化

### 进一步优化
使用HBAO(horizon-based ambient occlusion)或GTAO(Ground Truth Ambient Occlusion)方案替代SSAO
针对SSAO的Shader指令做进一步优化
可以采用烘焙AO到光照贴图的方案替换SSAO方案

### 为什么SSAO减少了22ms，整体却减少了35ms
因为**减少了带宽负载，增加了显存命中和渲染效率**。
每一次带宽，拥有一个overhead的临界点，比如能带30吨货物的车，运30吨需要一趟，但是30吨就需要两趟，超过这个临界点时，各个模块 都会增加额外开销

## AA反走样优化
### 反走样方案 （抗锯齿）
第一代：SSAA（超级采样抗锯齿Super-Sampling Anti-Aliasing)
第二代：MSAA（多重采样抗锯齿Multi Sampling Anti-Aliasing）、
FXAA（快速近似抗锯齿Fast Approximate Anti-Aliasing）、
SMAA（增强子像素形变抗锯齿Enhanced Subpixel Morphological Anti-Aliasing）
第三代：TAA（时间序列抗锯齿TemporalAnti-Aliasing）
第四代：DLSS（基于深度学习的超级采样DeepLearning Super Samplingg)

我会将这个图片转换为Markdown格式的表格，适合在Obsidian中使用：

| 方案   | URP支持                                                                     | 优点                                | 缺点                                                                                                        |
| ---- | ------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| MSAA | URP默认支持，适合绝大多数非延迟渲染游戏。                                                    | - 显卡硬件支持<br>- 反走样效果较好             | - 仅支持前向渲染<br>- 静态画面表现最好，运动画面一般<br>- 支持MRT的情况下效率较差<br>- 只能消除Geometry的反走样，对于高光像素部分无能为力                      |
| FXAA | URP默认支持，有Quality与Console两个不同版本，Quality版本需要PPV2。适合一些对低端硬件有要求、对画面模糊不敏感的特殊游戏 | - 后处理支持<br>- 开销非常小，适合移动端          | - 没有格外像素辅助，在高频颜色变化快的地方，动态场景会出现闪烁<br>- 对图形所有颜色边缘进行柔化处理，导致画面整体较模糊                                           |
| SMAA | URP默认支持，适合一些对低端硬件有要求的特殊游戏                                                 | - 后处理支持<br>- 开销相对较小，适合低端PC端       | - 没有格外像素辅助，在高频颜色变化快的地方，动态场景会出现闪烁<br>- 三次pass，开销相对FXAA高一些<br>- 切换RT开销在手机上可能造成开销<br>- 边缘处理比FXAA精细些，但依然有模糊表现 |
| TAA  | URP未来支持，可用PPV2扩展支持                                                        | - 支持延迟渲染<br>- 反走样效果较好<br>- 性能开销较小 | - 动态场景下，低帧率下可能出现鬼影<br>- 无法处理半透明物体、贴图序列帧动画物体<br>- 需要额外内存开销<br>- 需要MotionVector Buffer                      |

![](/images/performance/性能优化实战-1.png)

Q：Metal的片上内存优化

如果游戏建模本身较细，色彩过渡不跳的情况下，AA的开启与关闭变化不大的情况下，可以选择关闭

- 高端移动设备上采用优化后的SMAA或FXAA，Unity默认URP下的TAA成熟后，根据性能与表现均衡选择采用
- 中端移动设备上采用FXAA方式或关闭AA渲染
- 低端移动设备上关闭AA渲染

## 后处理效果优化
### 效果分类
1.色彩校正与增强
Channel Mixer、Color Adjustment、 Color Curves,Lift,Gamma,and Gain、Shadows/Midtones/Highlights.Tonemapping.White Balance 、Split Toning
2.画面效果增强
Bloom、Chromatic Aberration、Depth Of Field、Film Grain、Motion Blur
这些效果如果要启用，建议不要在Global Volume下一直开启，而是用LocalVolume下按不同逻辑下按 条件开启
3.镜头效果
Lens Disortion、I Panini Projection、Vignette.Lens Flare

| 效果列表                 | 描述      | 移动端性能开销            | 常用性 | 优化方式                         |
| -------------------- | ------- | ------------------ | --- | ---------------------------- |
| Bloom                | 泛光、镜头污垢 | 中高                 | 高   | 降采样、降低迭代次数、替换2遍模糊pass算法      |
| Channel Mixer        | 通道混合器   | 非常低                | 低   | 几乎无                          |
| Chromatic Aberration | 散色像差    | 中低（需要三遍采样）         | 低   | 几乎无                          |
| Color Adjustment     | 颜色调整    | 中                  | 高   | ColorGradingMode(HDR or LDR) |
| Color Curves         | 颜色曲线    | 低                  | 低   | 几乎无                          |
| Depth Of Field       | 景深      | 非常高                | 中低  | 切换Gaussian与Bokeh的景深模式        |
| Film Grain           | 胶片颗粒    | 中（需要采样多张贴图Lookup图） | 低   | 几乎无                          |


Q：RT切换，RT采样 

| 效果列表 | 描述 | 移动端性能开销 | 常用性 | 优化方式 |
|----------|--------|----------------|---------|----------|
| Lens Distortion | 镜头失真 | 中低 | 低 | 几乎无 |
| Lift,Gamma,and Gain | 提升、伽马与增益 | 非常低 | 低 | 几乎无 |
| Motion Blur | 运动模糊 | 高(需要MotionVector) | 中低 | MotionBlur质量分级、Intensity强度、Clamp摄像机旋转产生的速度可以具有的最大长度 |
| Panini Projection | Panini投影 | 中 | 低 | 几乎无 |
| Shadows, Midtones, Highlights | 阴影、中间调与高光 | 中低 | 低 | 几乎无 |
| Split Toning | 拆分着色 | 非常低 | 低 | 几乎无 |

| 效果列表          | 描述   | 移动端性能开销 | 常用性 | 优化方式                 |
| ------------- | ---- | ------- | --- | -------------------- |
| Tonemapping   | 色调映射 | 中       | 中   | 几乎无                  |
| Vignette      | 渐晕   | 中       | 低   | Intensity与Smoothness |
| White Balance | 白平衡  | 中低      | 低   | 几乎无                  |
| Lens Flare    | 镜头光晕 | 中高      | 中   | Occlusion设置与光晕数量     |
尽量将不需要的效果删除，而不是通过复选框禁用，有些效果即使禁用，依旧会预先绑定，导致内存的浪费

所有美术资源的制作标准都要以没有后处理效果的情况来敲定
后处理只做最终不得已的方案


![](/images/performance/性能优化实战-2.png)
如果是游戏，可以将pipeline设置Post-processing中的HDR改为LDR，LUT -Size也可以改为16

可以视情况，开启 sRGB与Linear 转换的快速近似函数。

如果是支持浮点精度纹理的平台或设备，Color Grading的HDR模式效率会更高。比如苹果就支持，那么GradingMode选项就可以改为HDR，LUT设置为32

两遍模糊Pass的优化，可以参考虚幻引擎提供的移动端Bloom方法
![](/images/performance/性能优化实战-3.png)
https://cdn2.unrealengine.com/Resources/files/GDC2014_Next_Generation_Mobile_Rendering-2033767592.pdf

# 项目设置与内存优化
所有之前的优化方案当发现不再合适的时候，就要肯放弃 
## Mipmap设置
Quality 中可以设置关闭某一Mipmap层级
可以开启Texture Streaming功能和MipMap Streaming功能
可以在摄像机上挂载Streaming Controller脚本为每个相机设置不同MipMap级别的偏移
通过设置Texture Streaming MipMap 上的Mip Map Priority 可以强制在预算内存范围内优先加载哪些纹理
