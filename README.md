<div align="center">

# 🚀 Lara CLI – A Powerful CLI Tool for Instant i18n Localization

</div>

## ⚡️ Getting Started

### **Step 1: Add Your Credentials to `.env`**

Create a `.env` file in the root of your project and add the following lines:

```
LARA_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID>
LARA_ACCESS_KEY_SECRET=<YOUR_ACCESS_KEY_SECRET>
```

Replace the placeholders with your **actual credentials**.

---

### **Step 2: Initialize Your Project**

Open your terminal in the root directory of your project and run:
```
npx @translated/lara-cli@latest init
```

The CLI will **automatically detect your localization directories** and prompt you with a few questions. These will be used to generate the configuration file: `.lara.yaml`.

---

### **Step 3: Translate Your Files!**

To translate the files into your target locales, run:
```
npx @translated/lara-cli@latest translate
```
And that's it – you're ready to go! 🎉

## 🖥️ Local Development
To test Lara CLI locally and use it in other projects, follow these steps:

1. **Clone the repository**
```bash
git clone https://github.com/humanstech/lara-cli.git
cd lara-cli
```

2. **Install dependencies and build**
```bash
pnpm install
pnpm run build
```

3. **Setup pnpm global bin directory (first time only)**
```bash
pnpm setup
```

4. **Link globally**
```bash
pnpm link --global
```

5. **Use anywhere**
```bash
# Now you can use 'lara' from any directory
lara-cli init --help
lara-cli translate --help
```

**Note:** After making changes to the source code, run `pnpm run build` to update the global command.

## 🧠 How Lara CLI Works Under the Hood

When you run Lara for the first time, it translates your project while leaving existing translations untouched — unless it detects inconsistencies between the files.

After the initial translation, a `.lara.lock` file is generated to keep track of changes. From that point on, whenever you modify your source locale file and request a new translation, **only the updated keys will be translated**.