# 🗿 CHUD.AI - Facial Analysis Engine
## *Find Your Wabi Sabi* 😉
**Advanced AI-powered facial geometry analysis with a modern Web Interface.**

CHUD.AI utilizes **MediaPipe Face Mesh** to map 468 distinct facial landmarks in real-time. It calculates complex geometric ratios—such as Canthal Tilt, FWHR, and Midface compactness—to provide an objective analysis of facial aesthetics directly in your browser.

> **Note:** This tool is for educational and entertainment purposes only.
---

* [Installation](https://www.google.com/search?q=%23-installation)
* [Usage](https://www.google.com/search?q=%23-usage)
* [Metrics Explained](https://www.google.com/search?q=%23-metrics-explained)
* [Troubleshooting](https://www.google.com/search?q=%23-troubleshooting)
* [Authors](https://www.google.com/search?q=%23-authors)

---

## ✨ Features

* **Real-Time Computer Vision:** High-fidelity tracking of facial landmarks using Google's MediaPipe.
* **Glassmorphism Dashboard:** A clean, dark-mode web interface built for clarity and aesthetics.
* **Live Visual Overlays:** Dynamic drawing of measurement lines on the video feed to visualize exactly what is being calculated.
* **10-Second Scan Mode:** Algorithms average data over a 10-second window to eliminate noise and jitter, providing a "Locked" final score.

# **Comprehensive Metrics:**
* 👁️ **Canthal Tilt:** Exact eye angle calculation.
* 📐 **FWHR:** Facial Width-to-Height Ratio.
* 📏 **Midface Ratio:** Compactness analysis.
* ⚖️ **Symmetry:** Bilateral comparison score.
* ✨ **Golden Ratio:** Proportions adherence score.

---

## 📺 Demo

<p align="center">
  <a href="https://www.youtube.com/watch?v=Jv91GEhY3nk">
    <img src="https://img.youtube.com/vi/Jv91GEhY3nk/0.jpg" alt="CHUD.AI Facial Analysis Demo" width="100%">
  </a>
  <br>
  <em>Click to watch the real-time neural mapping and aesthetic ratio analysis.</em>
</p>

---

## 🛠 Installation

### Prerequisites

* Python 3.10 or higher
* A working webcam

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/JaydenChan2/chud-ai.git
cd chud-ai

```


2. **Create a virtual environment**
It is highly recommended to use a clean environment to avoid conflicts.
```bash
# MacOS / Linux
python3 -m venv .venv
source .venv/bin/activate

# Windows
python -m venv .venv
.venv\Scripts\activate

```


3. **Install dependencies**
```bash
pip install -r requirements.txt

```



---

## 🚀 Usage

1. **Start the Server**
```bash
python app.py

```


2. **Access the Dashboard**
Open your browser and navigate to:
**[http://127.0.0.1:5000](http://127.0.0.1:5000)**
3. **Run an Analysis**
* Grant camera permissions when prompted.
* Position your face in the center until the status indicator turns **Green** (Excellent Conditions).
* Click the **START 10s SCAN** button.
* Hold still while the progress bar fills.
* Review your **Locked Results**.



---

## 📊 Metrics Explained

| Metric | Description | Benchmark |
| --- | --- | --- |
| **Canthal Tilt** | The angle of the eye axis relative to the horizon. | Positive tilt (outer corners higher) is often aesthetically preferred. |
| **FWHR** | Facial Width-to-Height Ratio (Bizygomatic width ÷ Upper facial height). | High FWHR (>1.9) is correlated with robust, masculine dimorphism. |
| **Midface Ratio** | The compactness of the middle third of the face. | Lower ratios (<0.95) indicate a more compact midface. |
| **Symmetry** | A bilateral comparison of facial landmarks. | 100% is perfect theoretical symmetry. Humans typically score 85-95%. |
| **Golden Ratio** | How closely facial proportions align with Phi (1.618). | Higher scores indicate closer adherence to neoclassical canons. |

---

## 🔧 Troubleshooting

**"Port 5000 is in use"**

* **MacOS Users:** This is common on macOS Monterey and later. The "AirPlay Receiver" feature uses port 5000 by default.
* **Fix:** Go to `System Settings` -> `General` -> `AirDrop & Handoff` and untick **"AirPlay Receiver"**. Alternatively, edit `app.py` to run on a different port (e.g., `port=5001`).

**"ModuleNotFoundError: No module named 'cv2'"**

* Ensure you have activated your virtual environment before running the app.
* Run `pip install opencv-python-headless` if the standard install fails.

---

## 👥 Authors

* **Jayden Chan**
* **Jayanth Vasupilli**
* **Adwait Gadigone**
* **Hasan Naqvi**

