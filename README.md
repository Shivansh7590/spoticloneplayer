# Spotify Clone Web Player

A Spotify-like web music player with user authentication, session persistence, and playlist management. Built with HTML, CSS, JavaScript, Netlify Functions (Node.js), and MongoDB Atlas.

---

## 🚀 Features
- Modern Spotify-inspired UI/UX
- User sign up, login, and greeting
- Session persistence (resume last played playlist/song)
- Playlists, playbar, and responsive design
- Serverless backend with Netlify Functions and MongoDB Atlas

---

## 🛠️ Deployment Instructions (Netlify + GitHub)

1. **Fork or clone this repository.**
2. **Set up MongoDB Atlas:**
   - Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a database user and get your connection string
3. **Configure Netlify:**
   - Create a new site on [Netlify](https://app.netlify.com/)
   - Link your GitHub repository
   - Ensure your `netlify.toml` has:
     ```toml
     [build]
       functions = "netlify/functions"
     ```
   - Set environment variables (if not hardcoded):
     - `MONGO_URI` = your MongoDB connection string
     - `JWT_SECRET` = any random string
4. **Push your code to GitHub.**
5. **Netlify will auto-deploy.**
6. **Check the Functions tab** in Netlify to ensure `auth` and `session` are deployed.
7. **Visit your site and test sign up, login, and music playback!**

---

## 👤 Owner & Contact

**Made by Shivansh Tiwari**  
[LinkedIn](https://www.linkedin.com/in/shivansh-tiwari-850a12319?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3B3thyCz3iSr2hkE88%2FtYvcg%3D%3D)  
[Instagram](https://www.instagram.com/shivaay.7590/)  
Email: shivanshtiwari6354@gmail.com

---

## 📄 License
This project is for educational/demo purposes. Contact the owner for collaboration or questions. 