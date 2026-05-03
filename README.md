# OSU-Hackathon-2026 : Canvas++

## Inspiration

As college students, we use Canvas every single day — it hosts every syllabus, assignment, and announcement for all of our courses. Despite this, getting real study help from Canvas still means manually copying content into an AI chatbot. We wanted to eliminate that friction entirely and build a tool that brings the AI to Canvas, not the other way around.

## What It Does

Canvas++ is a Chrome extension that automatically analyzes your course content and generates personalized quizzes and flashcards, no copy-pasting required. It injects buttons and UI elements directly into Canvas's existing interface, keeping the experience seamless and familiar. Under the hood, it uses Google Gemini to assess where a student is in their coursework and generate study material tailored to their current progress. To keep students motivated, Canvas++ layers in a progression system with daily quests, levels, and rewards that make studying feel less like a chore.

## How We Built It

Canvas++ is built as a Chrome extension using vanilla JavaScript, HTML, and CSS. We use the Canvas LMS API to fetch course content, and to avoid exposing API credentials on the client side, we built a Python/FastAPI backend hosted on Render. The backend handles all Gemini API calls through three main endpoints: course analysis, quiz generation, and flashcard generation, each returning structured data the extension consumes directly.

## Challenges We Ran Into

None of us had ever attended a hackathon or built a Chrome extension before, so we faced a steep learning curve on multiple fronts simultaneously. A significant chunk of time went toward understanding Chrome extension architecture and the Canvas API rather than building features. Midway through, we recognized that poor early organization was slowing us down and made the difficult call to refactor, which cost time but ultimately made the project more maintainable. The biggest surprise was needing to deploy our own backend to safely handle API keys, which required us to quickly learn Render and restructure how we thought about the project's architecture.

## Accomplishments That We Are Proud Of

In under 24 hours, we went from zero Chrome extension experience to a fully functioning tool that matches the vision we set out with. Beyond the technical achievement, we're proud of how we handled unexpected obstacles as a team, specifically the backend addition, without losing momentum. Seeing the extension inject seamlessly into Canvas and generate real, relevant study material was a very exciting moment.

## What We Learned

This hackathon compressed more practical web development learning into 24 hours than weeks of coursework. Specifically, we came away with a working understanding of Chrome extension architecture , REST API design with FastAPI, and cloud deployment with Render. On the project management side, we learned firsthand how early architectural decisions compound — and how much faster things move when everyone shares a clear mental model of the codebase.

## What Is Next

We have several features we didn't have time to implement that we think would make Canvas++ next level. At the top of the list: AI-powered assignment feedback that tells students what they did well, what to improve, and what topics to revisit. We also want to expand the progression system with new rewards, such as a Canvas pet beaver that wanders your page as you work, or unlockable UI themes tied to your level. Our goal is to keep developing Canvas++ after the hackathon and eventually publish it on the Chrome Web Store.
