import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import { getFirestore }
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDWNCFDZyRnqhpBeJ0Kitb7NWPYmSiPwBk",
  authDomain: "printer-48c2e.firebaseapp.com",
  projectId: "printer-48c2e",
  storageBucket: "printer-48c2e.firebasestorage.app",
  messagingSenderId: "1088312410257",
  appId: "1:1088312410257:web:ce353ed5b57754596e7f30"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
