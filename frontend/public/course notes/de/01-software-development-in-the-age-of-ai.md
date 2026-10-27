# Softwareentwicklung im KI-Zeitalter

> Aus den Kursfolien (83 Folien) destilliert. Wie KI die Softwareentwicklung verändert: Vibe Coding, Agentic Coding, Produktivitäts-Nachweise, Risiken und die Skills, die jetzt zählen.

---

## 1. Aufstieg KI-gestützter Programmierung

- Die Stack-Overflow Developer Survey 2025 beschreibt das heutige KI-Entwicklungsumfeld.
- Nvidias Jensen Huang glaubt, dass KI durch natürliche Sprachinteraktion jeden zum „Programmierer" machen wird.
- Echte Fälle: Eine Person ohne Coding-Hintergrund baute in 12 Tagen eine App mit Frontend, Backend und Datenbank; Microsofts CEO sagt, KI schreibt bis zu 30 % des Codes (in manchen Projekten den gesamten); Anthropics CEO prophezeite, in einem Jahr sei alles KI-generiert.
- **Einsatz der KI über den SDLC:**
  - **Discover (Entdecken)** — fremde oder neue Codebasen schnell verstehen und navigieren.
  - **Design (Entwurf)** — Thought Partner für Planung und Architektur: mehrere Implementierungsoptionen, Refactoring-Strategien, Bugfix-Pläne; technische Spezifikationen schreiben.
  - **Build (Aufbau)** — Code implementieren, Unit-Tests schreiben und ausführen, Commits und PR-Nachrichten verfassen.
  - **Deploy (Auslieferung)** — CI/CD-Pipelines automatisieren, Umgebungen konfigurieren, Deployments verwalten.
  - **Support & Scale (Betreuung & Skalierung)** — Fehler diagnostizieren, Logs analysieren, Fixes schneller als beim manuellen Debugging vorschlagen; Large-Scale-Refactoring unterstützen.
- **Tool-Landschaft**: Consumer (Replit, v0, Lovable, bolt …) und Developer (GitHub Copilot, Cursor, Windsurf, Claude Code, Antigravity, Trae, Opencode), plus Design-Tools (Figma, Google Stitch).

## 2. Vibe Coding

- Geprägt von **Andrej Karpathy**: „Sich voll und ganz den Vibes hingeben, Exponentialien umarmen und vergessen, dass Code überhaupt existiert." Fehlermeldungen einfach kopieren und zurückkleben — meistens löst sich das Problem dadurch.
- Der Praktiker steuert nach **Ergebnis**, nicht durch Zeilen-Review.
- Auch im Unternehmen angekommen: z. B. baute ein Sales- & Operations-Direktor ohne Engineering-Hintergrund bei iCHEF (Restaurant-Tech, TW) mehrere interne KI-Mini-Tools per „Vibe Coding" mit Gemini.
- Agentic Coding macht Prototypen-Generierung zu einer Sache von Minuten/Stunden statt Wochen.

## 3. Von LLM zu autonomen KI-Agenten

Drei Autonomie-Level:

| Level | Beschreibung |
|---|---|
| 1. Reaktiv | Rein reaktiv; braucht konkrete, schrittweise menschliche Anweisungen; erzeugt nur Antworten, kann Aufgaben nicht selbst abschließen |
| 2. Kollaborativ | Arbeitet zusammen mit einem Menschen an einem Ziel; meistert komplexe Prompts, schlägt Ideen vor, automatisiert Teile des Workflows (E-Mail-Entwürfe, Code-Snippets) — aber verlässt sich auf menschliche Richtung, Feedback und Freigabe |
| 3. Autonom | Hohes Maß an Autonomie: Mensch gibt ein Hochziel vor; der Agent bestimmt die Schritte, interagiert mit anderen Software/Tools und schließt die Aufgabe ohne kontinuierliche menschliche Intervention ab |

**Autonomie-Leiter (Autocomplete → Autonomie):**

1. Autocomplete — Token-Vorhersage im Editor
2. Inline-Vorschläge — komplette Funktionen aus einer Signatur
3. Chat-Generierung — Features in natürlicher Sprache beschreiben; funktionierenden Code erhalten
4. Coding-Agenten — Multi-File-Edits, Tool-Nutzung, Tests, Selbstkorrektur-Loop
5. Autonome Agenten — Repos klonen, in Sandbox planen, Tests ausführen, PRs einreichen

## 4. Wie Coding-Agenten arbeiten

- Drei Phasen: **Kontext sammeln → handeln → Ergebnisse verifizieren**.
- Tool-Familien: Dateioperationen (lesen, editieren, anlegen, umbenennen, reorganisieren); Suche (Dateien per Muster finden, Inhalte per Regex, Codebases erkunden); Ausführung (Shell-Befehle, Server starten, Tests, git); Web (suchen, Doku holen, Fehlermeldungen nachschlagen).
- Beispiel: „Fixe die fehlschlagenden Tests" → 1. Test-Suite ausführen, um zu sehen, was fehlschlägt → 2. Fehler-Output lesen → 3. relevante Quelldateien suchen → 4. Dateien lesen, um den Code zu verstehen → 5. Dateien editieren → 6. Tests erneut ausführen, um zu verifizieren.
- **Kontextfenster**: enthält alles, was der Agent über die Session weiß (Anweisungen, gelesene Dateien, eigene Antworten etc.). **Subagenten** bearbeiten Aufgaben in einem eigenen, separaten Kontextfenster, damit große Datei-Lesungen das eigene nicht belasten; nur Zusammenfassung und ein kleiner Metadaten-Anhang kommen zurück.

## 5. Harness Engineering

- OpenAI-Case Study: Ein Team mit **3 Engineers baute in 5 Monaten ein internes Produkt (~1 Mio. Zeilen Code) mit 0 handgeschriebenen Zeilen**. Jede Zeile (Applikationslogik, Tests, CI-Konfig, Doku, Tooling) wurde vollständig von Codex, OpenAIs KI-Coding-Agent, geschrieben. „Human steuern. Agents führen aus."
- „Die Hauptaufgabe des Software-Engineering-Teams ist nicht mehr, Code zu schreiben, sondern die Umgebung zu gestalten, die Intention zu spezifizieren und Feedback-Loops zu bauen, damit Codex-Agenten zuverlässige Arbeit leisten."

| Konzept | Regelt |
|---|---|
| **Prompt Engineering** | Was man sagt: Wortwahl, Struktur, System-/User-Prompts, Few-Shot-Beispiele |
| **Context Engineering** | Was das Modell sieht: reiche, strukturierte Informationen über Codebase, Architektur, Konventionen und Intention |
| **Harness Engineering** | Wie das gesamte Agent-System operiert: Tools, Guardrails, Feedback-Loops, Observability, Versionierung, Fehlererholung |

> **Agent = Modell + Harness.**

## 6. Bekannte Fehlmuster KI-generierten Codes

- **Das lila-Button-Problem**: Tailwind nutzte `bg-indigo-500` als Standardbeispiel-Color für Buttons; durch die hohe Frequenz in Tutorials, Sample-Projekten und Open Source assoziiert KI statistisch „Button" bzw. „modernes UI" mit diesem Lila — KI-generierte UIs fallen unverhältnismäßig oft auf lila Buttons zurück.
- **Security-Vorfälle in Vibe-coded-Apps:**
  - Ein „Vibe Coder" berichtete, dass sein komplett KI-entwickeltes SaaS-Business („zero hand-written code") angegriffen wurde: Nutzer konnten Abonnements umgehen, seine API-Keys aufbrauchen und die Datenbank korruptieren.
  - Tea (Women-only-Dating-App): massive Datenpanne, weil das Backend vollständig unsicher war. **Über 72.000 private Bilder und mehr als 13.000 staatliche Ausweisdokumente** wurden geleakt. Kritiker werfen die Schuld dem „Vibe Coding": KI-generierter Code ohne ordentliche Review ließ die Firebase-Datenbank ohne Authentication offen.
- Typische Security-Löcher in KI-generiertem Code: kein Rate-Limiting bei Login-Versuchen, ungesicherte API-Keys, Admin-Funktionen nur durch Frontend-Routen geschützt, DB-Manipulation aus dem Frontend.
- **Das 70-Prozent-Problem / die letzte Meile**: Nicht-Engineers kommen überraschend schnell 70 % hin; die letzten 30 % werden zur Übung in abnehmendem Grenznutzen. Die ersten 70 % sind die geradlinigen, *patterned* Teile (etablierte Pfade, gängige Frameworks); die letzten 30 % brauchen ernsthafte menschliche Expertise: Edge Cases, Architekturverfeinerung, Maintainability.
- KI steigert die **Code-Output**, erhöht aber auch **Rework**; GitClear fand 2024: duplizierte Codeblöcke mit 5+ Zeilen kamen ~10× häufiger vor als 2022 (8-facher Anstieg). KI-Vorschläge tendieren dazu, *neuen* Code hinzuzufügen, statt bestehenden zu verschieben, zu aktualisieren oder zu löschen.

## 7. Produktivitäts-Nachweise

- **Die schwierigste Teil der Softwareentwicklung ist das Verstehen, was gebaut werden muss** — „Es ist ein verbreiteter Irrtum, dass Developer nur tun, was man ihnen sagt (wie ein LLM). 80 % meiner Arbeit besteht darin, die riesigen Lücken zwischen Spezifikationen und Realität zu füllen … Spezifikationen werden oft ohne Berücksichtigung des Legacy und der Non-Happy-Paths definiert."
- **Stanford-Studie (~100.000 Developer, 27 Firmen, 136 Teams):**
  - **Greenfield** (neue Codebases, niedrige Komplexität): KI steigert die Produktivität um **~30–40 %**.
  - **Brownfield** (bestehende, mature Codebases, hohe Komplexität): Gewinne sehr begrenzt, **0–10 %**.
  - Je größer die Codebase, desto stärker bricht die KI-Effektivität ein: Kontextfenster-Limits, „Signal-zu-Rauschen"-Probleme, domänenspezifische Logik. Selbst SOTA-Modelle verlieren Leistung bei größeren Kontextfenstern (z. B. von 90 % auf 50 % bei 32k Tokens).
- **Brownfield ist „die Küche renovieren, während die Bewohner noch in der Wohnung leben"**: Man kann nicht einfach das Wasser abschalten oder den Strom kappen; Wände einreißen oder Rohre verlegen muss mit extremer Präzision geschehen.
- **Programmierung in der realen Welt ist messily (chaotisch)**: KI ist stark in abstrakter Mathematik und Algorithmen (GPT-5 erzielte einen perfekten Score bei der ICPC-Weltfinalrunde und löste alle 12 extrem schwierigen Probleme). Echte Codierung ist ganz anders: vage Business-Anforderungen in funktionierende Software übersetzen; Erwartungen managen, komplexe Legacy-Systeme verstehen, mit unberechenbaren menschlichen Faktoren umgehen. Herausforderungen für KI bei echtem Produktionscode: begrenzte Kontextfenster (100k–200k Tokens — nur ein Bruchteil einer mittelgroßen Codebase); komplexe Interdependenzen (Datenbanken, APIs, Microservices, Scripts, Wissen über Teams verstreut); Schwierigkeiten mit Business-Regeln, Edge Cases und menschlich getriebenen Ausnahmen; kann nicht einfach mit Menschen zusammenarbeiten, um unklare Anforderungen zu klären; versteckter Zustand und Infrastruktur-Komplexität (Caches, Message Queues, Session-Speicherung, verstreute Config-Dateien) — KI könnte Refactoring vorschlagen, ohne kritische Infrastruktur-Abhängigkeiten zu verstehen. **KI scheitert in chaotischen, realen Szenarien, die tiefes Kontextwissen erfordern.** Developer müssen weiterhin Kontext, Richtung und Qualitätskontrolle liefern; KI-Tools augmentieren Programmierer, ersetzen aber nicht menschliches Urteilsvermögen.

## 8. Arbeitsmarkt- und Karriere-Impact

- Anthropic warnt: KI könnte in 1–5 Jahren **50 % der White-Collar-Einstiegsjobs** eliminieren; Salesforce kündigte an, 2025 keine Software-Engineers mehr einzustellen.
- **Junior-Developer-Crisis**: KI automatisiert den Lernpfad — die Aufgaben, die KI am besten beherrscht (Boilerplate, simple Bugs, Test-Generierung), sind genau die Trainingsplätze für Junior-Engineers. Wenn wir Juniors das „Leiden" abnehmen, nehmen wir ihnen die Chance, aus ersten Prinzipien zu lernen. Wenn wir jetzt aufhören, Juniors einzustellen oder auszubilden, droht eine Krise, in der niemand die Systeme tief genug versteht, um zu debuggen, wenn KI fehlschlägt.
- Fall des Praktikanten: Vor der KI musste ein Manager, der eine Aufgabe delegierte, erst das Problem durchdenken, Anforderungen, Hintergrund und technische Spezifikationen schreiben, übergeben und dann Check-ins, Klärungen und Reviews durchführen. Mit KI kann der Manager, sobald Anforderungen und Design durchdacht sind, diese direkt an die KI zur schnellen Implementierung, Testung und Iteration geben — oft schneller als der komplette Praktikanten-Delegation-Zyklus. Während „Execution" zunehmend von KI erledigt wird, ist die wirklich wertvolle Fähigkeit für Praktikanten nicht mehr, gut spezifizierte Aufgaben auszuführen, sondern **lernen, wie man Probleme selbst definiert, scope-t und darüber nachdenkt**.
- KI macht Coden zu einer **Grundlehensfähigkeit**: Früher verbrachten Software-Engineers viel Zeit damit, nachzudenken, wie man eine Feature schreibt oder einen Bug fixt — das Schreiben von Code war eine Hauptquelle des Programmierer-Werts (Java, Python, React, APIs, Debugging, Feature-Building). KI ist sehr effektiv darin, klare Anforderungen in funktionierenden Code zu verwandeln (Interfaces bauen, Bugs fixen, Tests schreiben, Code refactorn). **Nicht wissen, wie man Code schreibt, reicht nicht — aber nur wissen, wie man Code schreibt, reicht auch nicht.**

### Neue Rollen und Bausteine

- **AI Engineer** (baut Anwendungen, die KI-Modelle per API nutzen) vs. **ML Engineer** (baut die KI-APIs selbst). Voraussetzungen: starke Software-Engineering-Grundlagen; Fähigkeit, verlässliche, skalierbare Anwendungen zu bauen; Wissen über moderne KI-Tools und Frameworks; Fokus auf User Experience und praktische Anwendungen.
- Bausteine von GenAI-Apps über das bloße LLM-API-Call hinaus: Prompting-Techniken, Agentic-Frameworks, **Evals, Guardrails, RAG, Voice Stack, Async-Programming, Data-Extraction, Embeddings/VectorDBs, Model-Fine-Tuning, GraphDB-Nutzung mit LLMs, agentic Browser/Computer-Use, MCP, Reasoning-Modelle** …
- **Tech-Job 2023 vs. 2026**: 2023 = HTML/CSS lernen → Demo-Projekte bauen → sich bewerben. 2026 = Systemdesign + Cloud-Infrastruktur + DevOps + Networking + Performance-Optimierung + Kommunikationsstärke … + LLM-API, AI-Agents, Prompt-/Context-Engineering … + echte Projekte bauen; sich von Tausenden Bewerbern abheben.
- **Zara Zhang** (Humaniora-Hintergrund, non-technical Builder): Mit Claude Code und anderen Coding-Agenten konnte sie echte Produkte end-to-end shippen; sammelte **30k+ GitHub-Stars**, darunter 5+ Projekte mit über 1.000 Stars. Sie argumentiert, dass Coden von einem Beruf zu einer allgemeinen Fähigkeit wird, wie Schreiben; dass in der KI-Ära **das Stellen der richtigen Frage wichtiger sein kann als das Schreiben des perfekten Codes**; und dass Humanisten heute besonders gebraucht werden: um echte User-Bedürfnisse, Pain Points und Chancen wahrzunehmen; Ideen aus persönlichen Frustrationen, Gesprächen und Feedback zu gewinnen; nicht nur Technologie, sondern Menschen zu verstehen — ihre Kämpfe, ihre Szenarien, ihre Jobs-to-be-done; und Urteilsvermögen, Ästhetik und den Unterschied zwischen „gut" und „besser" zu kennen.

## 9. Der neue menschliche Wert: vom Tun zum Definieren

- **HBR**: „KI macht Bauen leicht. Auszuwählen, was gebaut wird, ist schwerer." KI ist „gut in Execution, aber nicht darin, Ideen zu entwickeln". Wenn KI mehr vom „Wie" übernimmt, werden Menschen mehr Verantwortung für das **„Was" und „Warum"** tragen. Das Problem genug definieren, um etwas Roughes zu bauen, und diesen Prototypen nutzen, um das Problem weiter zu schärfen. Prototypen danach bewerten, welche Fragen sie aufwerfen, nicht wie fertig sie aussehen.
- **Product-Mindset**: in Begriffen von User- und Business-Ergebnissen über die gesamte Lebensdauer eines Produkts denken und handeln, nicht nur in Aufgaben- oder Feature-Abschluss.
- **Product-Mindset in der Softwareentwicklung**: aktiv die Motivationen, Pain Points und Workflows der User verstehen (nicht nur ein Requirements-Doc lesen); sehen, wie eine Änderung das gesamte Produkt und Ökosystem beeinflusst (Performance, UX, Maintainability); vor dem Sprung in die Implementierung fragen: „Welches Problem lösen wir?" und „Ist das die beste Lösung?"; verstehen, wie das Produkt Geld verdient, was Erfolg aussieht und wie Entscheidungen Kosten, Umsatz und Wettbewerbsfähigkeit beeinflussen; Trade-offs und technische Constraints in einfacher Sprache für PMs, Designer und Stakeholder erklären; unklare Anforderungen hinterfragen und Alternativen vorschlagen.
- **FireCut: Von der Idee zum Business**: FireCut ist ein KI-Video-Editing-Plugin für Adobe Premiere Pro und DaVinci Resolve, das repetitive Editing-Aufgaben automatisiert, damit Creator schneller einen Rough Cut produzieren. Suhail sammelte über 50 Probleme, auf die er stieß oder über die Leute klagten. **Vier Fragen, um Ideen zu filtern**: *Ist das Problem schmerzhaft genug? Können die User für eine Lösung bezahlen? Kann ich diese User leicht erreichen? Wächst der Markt?*
  - **Nutz deine Unfair Advantage**: Deine Vorteil kann Branchen-Erfahrung, Sprache, Netzwerk, Reputation oder Zugang zu einer bestimmten Kundengruppe sein. Suhails Vorteil war nicht nur Coding: Er hatte Zugang zum Video-Editing-Team seines Cambridge-Kollegen Ali Abdaal (YouTuber), potenzielle Beta-User, Business-Erfahrung und einen Creator-Distributionskanal. Er konnte echte Editorinnen befragen, deren Workflow beobachten und FireCut schnell mit ihnen testen. Diese Recherche führte zu einem Premiere-Pro-Plugin statt einer separaten Web-App: Die Editorinnen arbeiteten bereits in Premiere und wollten keine riesigen Uploads. **Nicht von Annahmen aus designen; beobachten, wie Menschen bereits arbeiten.**
  - **Baue den kleinstmöglichen Prototyp**: Die erste Version tat genau eine Sache — Pausen automatisch erkennen und entfernen. Suhail baute einen rauen Prototyp in etwa zwei Tagen mit Python, JavaScript und GPT-4 (KI half beim Code). Der Code war schmutzig, aber gut genug, um das Konzept zu testen: Scheren die User? Funktioniert es? Werden sie es nutzen? Wird jemand zahlen? Etwa 200 Menschen registrierten sich, ~20 testeten das Beta. Suhail iterierte sechs Wochen lang fast täglich, statt monatelang privat zu raten. User zeigten ihm, welche Features wichtig waren, was verwirrend war, was schlug und warum manche weggingen. Anfangs machte Suhail selbst Product, Research, Marketing, Sales, Support und Ops. Erst nach ~$30.000 monatlichem Umsatz stellte er professionelle Engineers ein und baute das Team aus.
- **Bauen wird leichter; Aufmerksamkeit wird nicht**: KI-Tools beschleunigen die Softwareentwicklung, schaffen aber keine zusätzliche menschliche Aufmerksamkeit oder Vertrauens. Wenn mehr Menschen Produkte shippen können, steigt der Wettbewerb, und es wird schwieriger, wahrgenommen zu werden.
- **Analogie des Restaurantmenüs**: Angenommen, eine KI designt ein Restaurantmenü — es kann fast sofort poliert aussehen. Aber: Ist das das richtige Menü für diese Kunden? Werden die Kunden das Essen mögen? Ist das Menük-Design gut? Passt es zur Marke? **Dafür gibt es keinen Pass/Fail-Test.** Die wahre Schwierigkeit hat sich zu „was als korrekt gilt" verschoben — das kann eine Maschine nicht allein entscheiden. *Ein Menü kann großartig aussehen und trotzdem das falsche Menü sein. Dafür gibt es keinen Test.* KI senkt die Kosten der Ausführung, aber die Richtung und das Urteil kommen immer noch von einem Menschen.
- **Taste (Geschmack)**: „Für Software-Engineers sagen wir oft, euer Alpha liegt im Taste. Bauen wir das Richtige? Ist das, was wir bauen, tatsächlich gut? Manche sagen, ein Agent kann dir sagen, ob es gut ist. Ich widerspreche: Ein Agent kann dir sagen, ob eine Sache *aussehen* korrekt ist, ob sie eine Spezifikation erfüllt. Das bedeutet nicht, dass er sagen kann, was *gut* ist. Gut kann aus UX-Sicht gut bedeuten, es kann delightful sein, es kann etwas sein, zu dem eine Person tatsächlich zurückkehren will. Und es ist noch hinreichend nuanciert, dass es Modelle Zeit kosten wird, das voll zu ersetzen. Wir sagen den Leuten, dass Urteilsvermögen, Verifikation und all diese anderen Aspekte weiterhin wichtig sind. Aber selbst wenn man sagt, vielleicht in einem oder zwei Jahren holen die Modelle auf — wir brauchen immer noch Engineers, die für diese Systeme haftbar gemacht werden können. Das geschieht nicht über Nacht. Das geschieht, wenn du ein System verstehst, die Leute dir vertrauen und du diese Expertise hast."

### Die neue Engstelle: Review-Kapazität
- Code-Generierung ist leicht; **Verifikation ist der Differenzierer.**
- Gute Tests schreiben (Unit/Integration/E2E); Code kritisch lesen; systematisch debuggen.
- **Der Aufstieg des Architekten**: Die Rolle des Entwicklers wandelt sich. Statt nach geschriebenen Code-Zeilen beurteilt wird, wird man beurteilt nach: **der Klarheit seiner Spezifikationen** und **der Strenge seiner Verifikation**.

### Von Vibe Coding zu Agentic Engineering

Der entscheidende Differenzierer: **Wie viel Struktur, Verifikation und menschliches Urteilsvermögen die KI-Output umgibt.**

| Dimension | Vibe Coding | Strukturiertes KI-gestütztes Coding | Agentic Engineering |
|---|---|---|---|
| Intent-Spezifikation | Casuelle Natural-Language-Prompts | Detailierte Prompts mit Beispielen und Constraints | Formale Spezifikationen, Architektur-Doku, Memory-Files |
| Verifikation | „Sieht so aus, als würde es funktionieren?" | Manuelle Tests, Stichproben | Automatisierte Test-Suiten, CI/CD-Gates, LLM-Judges |
| Codebase-Verständnis | Minimal; Developer liest ggf. nicht den generierten Code | Selektive Review kritischer Pfade | Umfassende Architektur-Review; KI behandelt Implementierungsdetails |
| Fehlerbehandlung | Fehlermeldungen an die KI zurückkleben | Developer diagnostiziert Root Cause, KI implementiert Fix | Agents selbst-diagnostizieren innerhalb definierter Grenzen; Menschen behandeln Architekturprobleme |
| Passender Scope | Prototypen, Scripts, persönliche Projekte, Hackathons | Features innerhalb etablierter Codebases | Produktionssysteme, teamskalige Entwicklung |
| Risikoprofil | Hoch; akzeptabel für Wegwerf-Code | Moderat; menschliches Urteilsvermögen an Checkpoints | Niedrig; systematische Verifikation in jeder Stufe |

## 10. Wesentliche Skills im KI-Zeitalter

1. **Wissen, was zu bauen ist und warum es zählt** — Welches Ziel dient diese Anforderung? Ist die Anforderung tatsächlich wichtig? Was sind die echten Probleme der User? Welche Features lohnen sich zu bauen und warum?
2. **Von der Implementierung zur Orchestrierung** — Du bist nicht nur noch ein Code-Schreiber. Die primäre menschliche Rolle im Software-Bau ist, **KI-Agents zu orchestrieren**, die Code schreiben, deren Output zu bewerten, strategische Richtung zu geben und sicherzustellen, dass das System die richtigen Probleme für die richtigen Stakeholder löst.
3. **Design und Zerlegung** — Wie sollte das System designed sein? Gibt es eine einfachere Lösung? Wie sollte die Arbeit zerlegt werden? Welche Teile kann KI behandeln? Welche Teile brauchen mein Urteilsvermögen?
4. **KI-Output (Pläne, Code) auf Verwendbarkeit prüfen und beurteilen** — Code-Review: Warum ist der Code so geschrieben? Ist der Code korrekt, flexibel und maintainable? Beeinflussen die Code-Änderungen die korrekte Funktion der bestehenden Codebases? Gibt es eine alternative, bessere Design auf Basis des Business-Kontexts? Wird die Code-Änderung das System unter extremem Traffic zum Absturz bringen? Wie testet man das auf katastrophalen Ausfall?
5. **Versteckte Probleme aufspüren**: unbehandelte Edge Cases, Permission-Leaks, Performance-Bottlenecks, versteckte Schwachstellen, Probleme und Tech Debt, bevor sie die Produktion erreichen.
6. **Produktionsreife Anwendungen und große Codebases entwickeln und pflegen**, die von Tausenden (oder mehr) echten Nutzern verwendet werden können; verstehen, was nach dem Shippen passiert: Zuverlässigkeit, Sicherheit, Stabilität, Incidents, langfristige Wartungskosten.
7. **Product- und Stakeholder-Skills** — mit Stakeholdern interagieren, um ihre Pain Points zu identifizieren, Feedback zu Prototypen zu sammeln und das Produkt iterativ zu verbessern; ein System bauen, das für Stakeholder wirklich nützlich ist und das sie gerne nutzen, dafür bezahlen und weiterempfehlen. **„Stakeholder-Skills" sind heute Kern-Engineering-Skills**: mit Stakeholdern sprechen, um ihre echten Probleme zu verstehen (User, Kunden, Geschäftsinhaber); der Engineer, der User tief versteht und das in präzise Agent-Anweisungen übersetzen kann, ist weit wertvoller.

> Während KI (einen Teil / die Mehrheit) der Coding-Aufgaben automatisieren kann, ist der Bau einer guten Software-Produkt, das wirklich nützlich ist, in der Produktion deployed wird, robust, skalierbar und zuverlässig von einer großen Zahl von Nutzern verwendet wird, **nicht trivial**!

### Im KI-Zeitalter wettbewerbsfähig bleiben
- Ein „mediokeren" Prototypen zu produzieren ist heute mit KI viel leichter — **Mittelmaß ist in der KI-Ära nicht gut genug**.
- **GitHub als neue Bewerbungsmappe**: Studenten sollten ermutigt werden, KI zu nutzen, um Tools zu bauen, Code zu schreiben oder Wissen zu organisieren, und diese Projekte auf Plattformen wie GitHub oder YouTube zu veröffentlichen. Wenn das GitHub-Projekt eines Studenten 3.000 Stars bekommt und von Hunderten genutzt wird, werden Arbeitgeber ihn basierend auf real-weltlichem Impact einstellen und die Einstiegs-Erfahrungsanforderung umgehen.
- Kommunikations- und Präsentationsskills verbessern; **Taste und Urteilsvermögen** entwickeln.

### KI mit Lern-Mindset nutzen
- Wenn sie dir eine Antwort gibt, **interrogiere sie und frage sie warum**.
- Führe die Aufgaben selbst aus / baue Dinge von Grund auf (ohne KI), um die Basics zu lernen.
- Fundamentale Dinge zu verstehen bleibt in der KI-Ära wichtig: Coding, Software-Engineering, Software-Architektur, Systemdesign.
- „Beim Coding kann dir die KI dieses Authentifizierungssystem generieren. Aber versuche, eines selbst zu bauen. Du wirst schlechteren Code schreiben, aber du wirst jede Zeile davon verstehen. Dieses Wissen verzinst sich."
