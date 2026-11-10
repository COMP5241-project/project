# KI-gestützte Softwareentwicklungs-Praktiken

> Aus den Kursfolien (44 Folien) destilliert. Praktische Workflows für die Arbeit mit Coding-Agenten: Context Engineering, AGENTS.md-Dateien, spezifikationsgetriebene Entwicklung, Agent-Skills und die Evidenz zur KI-Produktivität.

---

## 1. Monorepo vs. Polyrepo

- **Monorepo** — ein einziges Git-Repository für mehrere verwandte Projekte (z. B. `apps/` Frontend+Backend, `services/` Microservices, `packages/` gemeinsame UI/Utils mit Root-Workspaces).
- **Polyrepo (Multirepo)** — jedes Projekt/Service in seinem eigenen Repository.
- Offene Frage für KI-gestütztes Coding: Welche Anordnung dient dem Agent-Kontext besser?

## 2. Context Engineering

### Was füllt das Kontextfenster eines Coding-Agenten

Konversationshistorie · System- & Agent-Setup (Role-Prompt, Sicherheitsregeln, Projektprofil) · Code & Doku (Quellcode, README, Guidance-Dateien wie `CLAUDE.md`) · aktuelle Task-Anweisungen & Constraints · Tool-Beschreibungen (Schemas, MCP-Server) · Tool-Outputs (JSON, Fehler, Logs) · Streaming-Output.

### Das Modell mit dem richtigen Kontext verankern

- **Relevante** Dateien, Contracts, Beispiele, neueste API-Versionen, interne SDKs bereitstellen — damit das Modell nicht raten muss.
- **Keine ganzen Repositories** in den Prompt kippen; irrelevante Kontexte ausschließen, um Kosten zu senken und die Genauigkeit zu verbessern.
- Libraries/Doku mit Beispielen zusammenfassen; spezifisch sein (z. B. „Erstelle eine Streamlit-App. Verwende `st.login()` für die Authentifizierung").

> **Context Engineering** = sorgfältiges Kuratieren dessen, was das LLM in einer Session sieht, um Qualität, Zuverlässigkeit und Konformität mit den Projekt-Konventionen zu verbessern. **Zu wenig** Kontext reduziert die Effektivität; **zu viel** ist laut, teuer und kann das Verhalten verschlechtern.

## 3. Agent-Instruktions-Dateien

Eine spezielle Markdown-Datei, die Coding-Agenten zu Beginn jeder Session automatisch lesen und Projektziele, Tech-Stack und Konventionen mitgeben — damit der Code zum Projekt-Style passt und es zu weniger Fehlern kommt (falsches Framework, Duplizieren vorhandenen Codes).

| Tool | Ort |
|---|---|
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cursor | `.cursor/rules/*.mdc` oder `.cursorrules` |
| Claude Code | `CLAUDE.md` |
| Allgemein | `AGENTS.md` im Repository-Root |

### Was eine gute Instruktions-Datei enthält

- **Projektübersicht** — was sie tut, Zielgruppe, Kernfeatures.
- **Tech-Stack** — Backend/Frontend, Frameworks, DBs, APIs, Test-Tools, mit Nutzungshinweisen.
- **Coding-Guidelines** — Style-Regeln, Pflicht-Tests, API-Design, Security-Praktiken, Datei-/Ordner-Konventionen.
- **Projektstruktur** — Hauptordner und ihre Zwecke (wo Code/Tests/Doku liegen).
- **Ressourcen & Tools** — Setup-/Test-/Deploy-Scripts, Custom-Tools, nützliche Dateien.

### Evidenz (AGENTS.md-Evaluations-Paper)

- **Auto-generierte AGENTS.md senkt die Success-Rate um ~3 % und erhöht die Inference-Kosten um 20 %+** (LLM-generierte Dateien sind redundant mit bestehender Doku).
- **Von Menschen geschriebene AGENTS.md verbessert die Performance nur marginal (~4 %)**; Agenten folgen den Anweisungen, aber unnötige Anforderungen machen die Tasks schwieriger.
- **Einbeziehen** — **WAS** (Tech-Stack, Struktur, was jeder Teil tut — kritisch für Monorepos), **WARUM** (Zweck/Intention), **WIE** (Build, Test, Verifikation; nicht offensichtliches Tooling wie `uv` statt `pip`, `bun` statt `npm`).
- **Auslassen** — detaillierte Codebase-Übersichten/Verzeichnislisten (Agenten entdecken die Struktur selbst), Task-spezifische Anweisungen, die nur manchmal gelten (sie verwässern jede Session), und **auto-generierte Inhalte** (die Daten zeigen, dass sie mehr schaden als nützen).

## 4. Model- & Workflow-Praktiken

- **Modelle bewusst wählen** — jedes LLM hat Stärken; für Planung/Architektur reasoning-lastige Modelle, für die Implementierung schnelle Modelle verwenden; wenn ein Modell feststeckt, wechseln, um den Blindspot zu durchbrechen.
- **Plan-Modus** — vor dem Schreiben jeglichen Codes einen detaillierten Implementierungsplan erstellen.
- **In kleinen, testbaren Inkrementen arbeiten** — große monolithische Prompts erzeugen Inkonsistenz, Duplizierung, ein chaotisches Durcheinander. Arbeit in kleine Tickets zerlegen: eine Funktion implementieren → mit Tests verifizieren → iterieren. Beispiel-Reihenfolge: (1) Frontend mit gemockten Daten, (2) Backend-REST-API + kleiner Test-Client, (3) integrieren, (4) Datenbank hinzufügen, (5) refactorn, sobald End-to-End funktioniert.
- **Häufig committen** — häufige kleine Commits sind „Save-Points" für ein schnelles Rollback, wenn der KI-Code schiefgeht; Branches/git-Worktrees als **Sandboxen** verwenden, damit parallele KI-Sessions nicht kollidieren.
- **Regelmäßig refactorn** — KI-gestütztes Coding häuft technische Schulden auf; lange Funktionen aufteilen, große Module zerlegen, Duplizierung entfernen (KI bevorzugt das Generieren neuen Codes gegenüber der Wiederverwendung Bestehenden), Code wiederverwendbar/testbar machen.
- **„Chatting ist kein Engineering."** Casuales Vibe-Coding erzeugt ein „Kartenhaus", das funktioniert, bis das Kontextfenster schließt — dann ist es schwer zu pflegen, zu debuggen oder zu skalieren.

## 5. Spezifikationsgetriebene Entwicklung (SDD)

- **Spec first**: Die Spezifikation mit der KI iterieren, bevor Code geschrieben wird — Anforderungen (Edge Cases, User-Flows), Architektur (Tech-Stack), Datenmodelle (Schema), Teststrategie.
- **Kernidee von SDD**: Formale, detaillierte Specs sind die **„ausführbaren Blaupausen" und Single Source of Truth**; Code ist ein **abgeleitetes Artefakt**. Entwickler definieren das *Was* und *Warum*; die KI übernimmt das *Wie*.
- Tools: **GitHub Spec Kit**, **AWS Kiro**.

### Kernkomponenten

- **Constitution** (`constitution.md`) — Governance-Dokument nicht verhandelbarer Prinzipien: Tech-Stack (z. B. React/Tailwind), vor jedem Commit Tests ausführen, TypeScript Strict-Mode, niemals Secrets committen.
- **Funktionelle Spec** (`spec.md`) — das „Was".
- **Technischer Plan** (`plan.md`) — das „Wie".
- **Kontext-Dateien** (`AGENTS.md`, `SKILL.md`) — persistente Anweisungen, ein „README für KI-Agenten".

### Lebenszyklus

1. **Spezifizieren** — User-Stories, Akzeptanzkriterien, Edge Cases, Fehlerbehandlung, Success-Metriken; noch keine technischen Entscheidungen.
2. **Planen** — Der Agent schlägt Architektur, Datenmodelle, API-Contracts vor; der Developer reviewt gegen die Standards und die Constitution.
3. **Atomare Task-Generierung** — Der Plan wird in kleine, testbare Tasks zerlegt; eine nach der anderen, mit menschlichen Checkpoints.
4. **Implementieren** — Der Agent codet Task für Task gegen die starre Spec/Plan; der Developer wechselt vom Schreiben von Syntax zur **Verifikation des Outputs gegen die Akzeptanzkriterien**.

### Spec-Drift

- Wenn ein Agent Code ändert, ohne die Spec zu prüfen, driften Code und Doku auseinander.
- **Bugs = fehlende Anforderungen**: Die Spec expliziter aktualisieren (dauerhafter Fix, erhält Kontext für zukünftige Agenten, verhindert die bei manuellem Patching typischen Regressions).
- Neue Features: Zuerst die Spec aktualisieren → die KI identifiziert die Delta → der Plan wird aktualisiert (neue Datenmodelle/Services) → neue Tasks werden generiert → sichere Implementierung.

## 6. Agent-Skills

**Idee**: Agenten sind fähig, aber ihnen fehlt Kontext für verlässliche reale Arbeit. **Skills** verpacken prozedurales Wissen und team-spezifische Kontexte in **portable, versionskontrollierte Ordner, die bei Bedarf geladen werden**.

- **Domänen-Expertise** — spezialisiertes Wissen (Legal-Review, Data-Pipelines, Präsentations-Formatierung) als wiederverwendbare Anweisungen erfassen.
- **Wiederholbare Workflows** — Multi-Step-Tasks in konsistente, auditierbare Verfahren verwandeln.
- **Cross-Product-Wiederverwendung** — einmal bauen, in jedem skills-kompatiblen Agenten nutzen.

### Struktur

```
my-skill/
├── SKILL.md      # Pflicht: Metadaten (Name, Beschreibung) + Anweisungen
├── scripts/      # optional: ausführbarer Code (getestet, deterministisch)
├── references/   # optional: bei Bedarf geladene Doku
└── assets/       # optional: Vorlagen, Ressourcen
```

- `SKILL.md` ist „ein Handbuch, das dem Agenten beibringt, wie man eine bestimmte Task abschließt" — z. B. eine Website-UI-Skill, die „keine blau-lila-Verläufe, SVG-Icons statt Emoji, gefrostete Glas-Nav-Bar, Hero mit Overlay, Brand-Akzent-Buttons" codiert.
- **Skill-Pfade je Agent**: `.cursor/skills/`, `.claude/skills/`, `.github/skills/`, `.opencode/skills/`, allgemein `.agents/skills/`.
- **Wenn SKILL.md zu lang wird**: Jeden Style in seine eigene Referenz-Datei aufteilen (`minimalist.md`, `tech-style.md`, `editorial.md`); `SKILL.md` wird zu einer Zusammenfassung mit Zeigern — der Agent liest sie zuerst und lädt dann nur die relevante Referenz.
- **Scripts** lassen den Agenten getesteten Code für Berechnungen, Transformationen, Validierung, Tool-Interaktion aufrufen — vorhersagbar (z. B. `python scripts/generate_image.py --style tech`).

### Progressive disclosure (3 Level)

1. **Metadaten** (Name + Beschreibung) — werden immer beim Start geladen.
2. **Anweisungen** (SKILL.md-Body) — werden geladen, wenn die Skill ausgewählt ist.
3. **Optionale Ordner** (scripts/references/assets) — werden bei Bedarf geladen.

Der Agent hält ein **Katalog** von Skill-Namen/Beschreibungen vor; auf eine Anfrage wie „Entwickle eine schöne Blog-Website" ordnet er `website-ui-design` zu und lädt dann die komplette Guidance.

### Composable > monolithisch

- **Isoliertes Debugging** — Eine fokussierte Skill, die fehlschlägt, sagt genau, welche Datei/welche Parameter kaputt sind; monolithische Prompts mit widersprüchlichen Regeln sind nicht diagnosierbar.
- **Kumulierende Verbesserungen** — Ein Update an einem Sub-Skill upgradet jeden Workflow, der es nutzt; vermeidet Regel-Duplizierung/-Verfall.
- **Hohe Wiederverwendbarkeit** — Plug-and-Play: Jeder Subagent oder Prompt kann eine gespeicherte Skill auslösen.
- Bedeutende öffentliche Sammlungen: Matt Pococks Skills (aihero.dev/skills), Addy Osmanis agent-skills (Define → Plan → Build → Verify → Review → Ship-Phasen, z. B. `interview-me`, `spec-driven-development`, `planning-and-task-breakdown`, `test-driven-development`, `doubt-driven-development`, `code-review-and-quality`, `git-workflow-and-versioning`, `ci-cd-and-automation`, `shipping-and-launch`).
- Beispiel-Skill-Lebenszyklus (frontend-slides): Job-Typ erkennen → Content-Fragen → Style per Preview wählen → Single-HTML-Deck generieren → optionale PPTX-Extraktion → mit Klick-zum-Bearbeiten liefern → optionales Publishen/PDF-Export (Scripts: `extract-pptx.py`, `deploy.sh`, `export-pdf.sh`).

## 7. Evidenz: MERT-Studie (2025)

Randomisierte kontrollierte Studie, erfahrene Developer, 246 reale Coding-Tasks:

- Developer **erwarteten**, dass sie durch KI um **24 %** schneller werden — es dauerte tatsächlich **19 % länger**.
- **Code-Review-Zeit +91 %** bei Teams, die KI stark einsetzen.
- **Pull-Request-Größen wuchsen um 154 %**.
- „Während wir uns produktiv fühlen, indem wir Tab drücken und Vorschläge akzeptieren, häufen wir Code an, den wir nicht vollständig verstehen."

## 8. Kritische Skills im KI-Zeitalter

- Zu verstehen, **warum** das System funktioniert (Architektur), zählt mehr als Code zu produzieren.
- Sicherstellen, dass die KI bestehendes Verhalten nicht kaputt macht/ändert; sicherstellen, dass die generierte Architektur skalierbar, flexibel und pflegbar ist.
- **KI erklären lassen**: „Erkläre mir diesen Code zeilenweise in einfacher Sprache." / „Welche Annahmen trifft er? Was könnte schiefgehen?" / „Was sind die Edge Cases und Failure-Modes?"
- **Keinen Code einreichen/akzeptieren, den man nicht erklären kann.**
- KI-Code gezielt auf Mängel, Security-Probleme und Architekturverletzungen prüfen.
- **Regelmäßig ohne KI üben** — Boilerplate, einfache Bugs und Test-Generierung als Lernübungen lassen, nicht als Produktions-Shortcuts.
