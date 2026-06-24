# SpeakMate AI — Android Studio se Build karne ka Guide (Hinglish)

Local Windows pe crash ho raha hai. Android Studio se build karne ka **safest** tareeqa ye hai. CLI ke sare jhanjhat skip ho jate hain.

---

## ⚠️ Pehle ek baar karna hai (One-time Setup)

### Step 1: GitHub se latest code pull karo
Emergent UI mein **"Save to GitHub"** dabao (chat input ke paas). Phir local pe:

```powershell
cd D:\sm\SpeakMateAI
git fetch origin --prune
git checkout SpeakMATEAI
git pull origin SpeakMATEAI
```

### Step 2: Corrupt local state wipe karo
PowerShell mein (D:\sm\SpeakMateAI ke andar):

```powershell
# Sab kuch band karo
Get-Process java, node, studio64 -ErrorAction SilentlyContinue | Stop-Process -Force

# Purana sab delete
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force yarn.lock -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches\transforms-*" -ErrorAction SilentlyContinue
```

### Step 3: Fresh install + prebuild
```powershell
yarn install
npx expo install --fix
npx expo prebuild --platform android --clean --no-install
```

Ye `android/` folder fresh banayega — JS aur Native code 100% sync rahega. **Crash ka root cause yahi fix hota hai.**

### Step 4: gradle.properties patch (Metaspace OOM se bachao)
File: `D:\sm\SpeakMateAI\android\gradle.properties` — file ke **end mein** ye lines add karo (Notepad se):

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8
org.gradle.daemon=false
org.gradle.parallel=false
kotlin.incremental=false
```

---

## 🚀 Ab Android Studio mein Build karo

### Step 5: Android Studio kholo — **SIRF `android` folder**
- Android Studio open karo
- **File → Open** dabao
- Select karo: `D:\sm\SpeakMateAI\android` *(NOT SpeakMateAI root folder — sirf android sub-folder)*
- "Trust Project" pe haan karo

### Step 6: Gradle Sync ka wait karo
- Niche right corner mein "Gradle Sync in progress..." dikhega
- 5-15 minute lagega (pehli baar)
- **"Sync finished" aane tak kuch mat dabao**
- Agar koi "Update Gradle Plugin" popup aaye → **"Don't ask again for this project"** + Cancel

### Step 7: Phone connect karo (Debug Build pehle test karne ke liye)
- USB se phone connect karo
- Phone pe **USB Debugging** ON karo (Developer Options se)
- Android Studio mein top-right pe aapka phone name dikhna chahiye

### Step 8: Run karke crash check karo
- Top bar mein **green ▶ "Run 'app'"** button dabao
- 10-15 min build hoga
- App phone pe automatic install hokar khulegi
- **Agar yahaan crash nahi hua → 90% kaam done.**

---

## 📦 Release APK / AAB banao (Play Store ke liye)

### Step 9: Signed AAB generate karo
1. Android Studio menu: **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle (AAB)** *(Play Store iska use karta hai)* → Next
3. **Key store path** mein browse karke select karo: `D:\sm\SpeakMateAI\speakmateai-release.jks`
4. Keystore password, key alias, key password daalo *(jo aapne keystore banate waqt set kiya tha)*
5. **"Remember passwords"** check karo → Next
6. **release** select karo → **Finish**
7. 15-25 min wait → niche right corner pe **"locate"** link aayega
8. AAB file yahaan milegi:  
   `D:\sm\SpeakMateAI\android\app\build\outputs\bundle\release\app-release.aab`

### Step 10: Play Console pe upload
- play.google.com/console kholo
- App → Production → Create new release → AAB upload karo

---

## 🐛 Agar crash phir bhi aaye

Run ke baad **Logcat** kholo (Android Studio bottom):
- Filter: `com.speakmate.ai`
- Level: **Error**
- Crash hone par red lines aayengi → screenshot lekar mujhe bhejo

Ya phir terminal mein:
```powershell
adb logcat *:E | Select-String "speakmate|AndroidRuntime|FATAL"
```

---

## ✅ Recap (Sirf 4 cheez yaad rakho)

1. `android` folder delete → `npx expo prebuild --platform android --clean`  
2. Android Studio mein **sirf `android/` sub-folder** kholo  
3. Gradle Sync **complete** hone do  
4. Run ▶ se test → Build → Generate Signed Bundle (AAB) → Play Store upload  

Koi step pe atak jao → screenshot + error text bhejo. Saath hain. 💪
