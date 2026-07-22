from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
import os

# Create a PDF blueprint
pdf_path = os.path.join(os.path.dirname(__file__), "..", "DataCenter_Retrofit_Blueprint.pdf")
c = canvas.Canvas(pdf_path, pagesize=landscape(A4))
width, height = landscape(A4)

# Draw Title
c.setFont("Helvetica-Bold", 24)
c.drawString(50, height - 50, "NEXUS EPC - DATA CENTER RETROFIT PLAN")
c.setFont("Helvetica", 14)
c.drawString(50, height - 70, "Project: 300kW DGX SuperPOD Cooling Loop Integration")

# Draw a rough floor plan (Rectangles)
c.setStrokeColorRGB(0, 0, 0)
c.setLineWidth(2)

# Main Room
c.rect(50, 50, width - 100, height - 150)

# Server Racks
c.setStrokeColorRGB(0.2, 0.6, 0.2)
for i in range(4):
    c.rect(100 + i * 150, 150, 80, 200)
    c.drawString(110 + i * 150, 250, "SRV-RACK")

# Liquid Cooling Line (LC-101) - Blue
c.setStrokeColorRGB(0, 0, 1)
c.setLineWidth(5)
c.line(120, 100, 120, 450)
c.setFont("Helvetica-Bold", 12)
c.setFillColorRGB(0, 0, 1)
c.drawString(130, 400, "LC-101 (Liquid Cooling Loop)")

# 480V Tray (HV-202) - Red
c.setStrokeColorRGB(1, 0, 0)
c.setLineWidth(5)
c.line(50, 350, width - 50, 350)
c.setFillColorRGB(1, 0, 0)
c.drawString(600, 360, "HV-202 (480V Busway Tray)")

# Clash Point Highlight
c.setStrokeColorRGB(1, 0.5, 0)
c.circle(120, 350, 30)
c.drawString(150, 330, "<- Critical Clash Detected Here")

c.save()
print(f"Blueprint generated at: {pdf_path}")
