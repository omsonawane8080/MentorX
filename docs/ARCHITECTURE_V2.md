\# MentorX v2 Architecture



\## Project Overview



MentorX is an AI-powered desktop application designed to help students and professionals prepare for technical careers from beginner level to job-ready level.



The application combines:



\- AI Roadmap Generation

\- Daily Learning Planner

\- AI Mentor

\- AI Quiz Generator

\- Mock Interviews

\- Progress Tracking

\- Project Tracking

\- Reports \& Analytics



The long-term goal is to support preparation for any technical domain such as:



\- AI / ML

\- Data Science

\- SAP ABAP

\- Java

\- Python

\- Web Development

\- Cloud Computing

\- DevOps

\- Cybersecurity

\- Data Analytics



\---



\# Current Architecture



```

Electron Desktop

&#x20;       │

React Frontend

&#x20;       │

TypeScript

&#x20;       │

Supabase Database

&#x20;       │

OpenAI API

```



\---



\# Current Technology Stack



\## Desktop



\- Electron



\## Frontend



\- React 19

\- TypeScript

\- Vite



\## Database



\- Supabase



\## Authentication



\- Supabase Auth



\## AI



\- OpenAI API



\## Styling



\- Plain CSS



\## Icons



\- Lucide React



\---



\# Planned Technology Stack (v2)



The following technologies will be added during the MentorX v2 refactor.



\## UI



\- Tailwind CSS

\- Shadcn/UI



\## State Management



\- Zustand



\## Server State



\- TanStack Query



\---



\# Architecture Decision



Decision:



Refactor the existing project instead of rebuilding from scratch.



Reason:



\- Existing application is already functional.

\- Dashboard is complete.

\- Daily Planner works.

\- Roadmap works.

\- Quiz system works.

\- Mentor Review works.

\- Reports work.

\- Settings work.

\- Authentication works.



This reduces development time and preserves existing functionality.



\---



\# Development Principles



\- Build one feature at a time.

\- Test after every change.

\- Keep the application stable.

\- Write documentation for major changes.

\- Commit frequently using Git.

\- Avoid unnecessary dependencies.



\---



\# Long-Term Vision



MentorX will evolve into a complete AI Career Mentor platform that provides:



\- Personalized Roadmaps

\- AI Tutor

\- AI Mentor

\- AI Interviewer

\- Resume Analyzer

\- ATS Resume Checker

\- Skill Tree

\- Career Coach

\- Voice Mock Interviews

\- Learning Analytics

\- Progress Tracking

\- Portfolio Review



\---



\# Current Status



Day 2



Architecture Planning Phase



Status:

In Progress

