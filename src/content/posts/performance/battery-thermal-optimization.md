---
title: 耗电与发热优化
published: 2025-04-22
description: '总结移动端项目中耗电与发热问题的来源及优化方向。'
tags: [unity, performance, mobile, thermal]
category: Unity Engine
draft: false
---
可以通过 UPR或者XCode检查耗电量的来源
现在游戏遇到的耗电问题都是性能问题，我们的优化主要是推迟温度墙降频的触发时间，让降频时间缩短

## 造成温度过高的原因
![](/images/performance/耗电与发热优化-1.png)
能优化的点几乎都是CPU和GPU负载的优化
## 常规负载优化
- CPU负载
- GPU负载
- 60fps->CPU 10-12ms GPU 6-8ms
- 30fps->CPU 18-20ms GPU 8-10ms

CPU可以适当放宽
## 非常规优化
1. 网络与IO
	- 发包频率
	- 频繁IO读写
2. 显示亮度与FPS
	- 省电模式
	- OnDemandRendering
3. 三方库
	- Wwise/Criware
	- 平台SDK
主动降低显示频率、动态分辨率、降低屏幕亮度
网络通讯数据每秒2kb时，耗电量就会提高 
精简网络包大小，降低消息发送频率（如心跳包）可以减少电量消耗

## 如何调整显示帧率
不要通过 `Application.targetFrameRate`进行调整。因为会导致显示频率和输入频率一起下降
使用OnDemandRendering的RenderFrameInternal进行调整，只会降低显示频率

### Wwise
非常重的音频库
### Criware
更重的视频解码库，不建议Criware解码的纹理作为视频使用
