# 📚 NotesByRaheem.xyz
**The Dedicated Notes-Sharing & Collaboration Hub **

NotesByRaheem.xyz is a centralized academic platform designed to streamline resource sharing and foster real-time collaboration among students. The system ensures high-quality study materials through administrative oversight and provides a modern space for class-wide discussion.

---

## 🌟 Key Features

### 📁 Resource Management
* **Notes Engine:** Efficient upload and download system for PDFs and images.
* **Admin Approval Workflow:** To prevent spam, all notes are reviewed by an Admin before becoming public.
* **Bookmarking:** Save important materials to your personal "Favorites" for quick access during exams.

### 💬 Real-Time Communication
* **Course Chatrooms:** Dedicated channels for every subject in the curriculum.
* **Global Chatroom:** A shared space for general discussions and class announcements.
* **Moderated Messaging:** Users can manage their own history, while admins ensure community standards.

### 🏆 Gamification
* **Leaderboard System:** Recognizes and ranks top contributors to encourage a culture of sharing.

---

## 💻 Tech Stack

* **Frontend:** [React 18](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/) for a robust, type-safe UI.
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/) for a sleek, modern design.
* **Backend & Infrastructure:** [Supabase](https://supabase.com/)
    * **PostgreSQL:** Relational database for notes, logs, and messages.
    * **Auth:** Secure user session management (Manual Account Provisioning).
    * **Storage:** Cloud buckets for hosting notes files (PDFs/Images).
    * **Edge Functions:** Serverless logic for backend operations.

---

## 🔐 Account & Access Control

To maintain a secure, academic-focused environment, **self-signup is disabled**. Accounts are manually provisioned by the developers to prevent spam.

### User Roles & Permissions
| Feature | Student | Admin | Owner |
| :--- | :---: | :---: | :---: |
| View/Download Notes | ✅ | ✅ | ✅ |
| Upload Notes (Pending) | ✅ | ✅ | ✅ |
| Chat in All Rooms | ✅ | ✅ | ✅ |
| Approve/Reject Notes | ❌ | ✅ | ✅ |
| Edit Course Info | ❌ | ✅ | ✅ |
| User Management | ❌ | ❌ | ✅ |
| System Announcements | ❌ | ❌ | ✅ |

---

## 📁 Project Structure

```text
src/
├── components/     # shadcn/ui components & custom UI elements
├── hooks/          # Custom React hooks for Supabase real-time data
├── lib/            # Supabase client config & utility functions
├── pages/          # Dashboard, Chatrooms, Leaderboard, & Profile
├── types/          # TypeScript interfaces for DB schema & Auth
└── App.tsx         # Routing & Auth Provider logic

##⚙️ Setup & Development
Prerequisites
  *Node.js (v18+)

  *Supabase Account & Project

#Local Installation
1.Clone the repository:

Bash
git clone [https://github.com/Usman1dev/NotesByRaheem.git](https://github.com/Usman1dev/NotesByRaheem.git)
cd NotesByRaheem
2.Install dependencies:

Bash
npm install
3.Configure environment:
Create a .env file in the root:

VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
Launch:

Bash
npm run dev
---
⚠️ Guidelines
Be Respectful: No harassment or toxic behavior in chatrooms.

Quality Content: Upload legible and accurate notes only.

Academic Integrity: Follow university policies regarding resource sharing.

No Spam: Avoid flooding chatrooms or uploading duplicate files.

👨‍💻 Developed By
Usman Github:https://github.com/Usman1dev

Abdur Raheem Github:https://github.com/raheemxghumman

🚀 Get Started
DM the developers with your Name, Roll No, and desired Username to receive your credentials.

Visit: notesbyraheem.xyz

Login & Change Password: Head to your profile dashboard to set a secure password.

Start Sharing!
