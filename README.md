# Kisan AI

AI-powered agricultural assistant for farmers with real-time monitoring, e-consultation, and computer vision-based crop analysis.

## Tech Stack
- **Frontend:** React Vite + TypeScript + tRPC + Zustand
- **Backend:** Node Express + Python Proxy + SSE
- **AI/ML:** Vertex AI + GPT OSS 120B + YOLO AgriNet

## Key Features
- **Monitoring** - Real-time farm monitoring with YOLO-based detection
- **E-Consult** - AI-powered agricultural consultation
- **Market Insights** - Data-driven market analysis
- **Marketplace** - Equipment and resource trading

---

## Architecture Documentation

### A2A (Agent-to-Agent) Communication
Dual-agent system with built-in tool calling between User and Sarvam Indus agent.

![A2A Architecture](research/a2a.png)

---

### System Overview
Complete tech stack and feature flow mapping from input to user retention.

![System Architecture](research/architecture.png)

---

### Live Monitoring
Temporal aggregation process for real-time frame analysis with confidence scoring.

![Live Monitoring](research/frames.png)

---

### Hallucination Prevention
Multi-layer validation approach to prevent AI hallucinations through context engineering.

![Hallucination Prevention](research/hallucination.png)

---

### Image Analysis Pipeline
CNN/YOLO8 pipeline for soil, heatmap, and drone image analysis.

![Image Analysis](research/image%20extraction.png)

---

*Last Updated: March 2026*
