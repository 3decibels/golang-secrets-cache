// Home Component (Create)
const Home = {
    secret: "",
    loading: false,
    link: null,
    error: null,

    oninit: function() {
        Home.secret = "";
        Home.loading = false;
        Home.link = null;
        Home.error = null;
    },

    createSecret: async function (e) {
        e.preventDefault();
        if (!Home.secret.trim()) return;

        Home.loading = true;
        Home.error = null;
        Home.link = null;

        try {
            // Generate Key
            const cryptoKey = await window.crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );

            // Export key to raw hex string
            const exportedKey = await window.crypto.subtle.exportKey("raw", cryptoKey);
            const keyArray = new Uint8Array(exportedKey);
            const keyHex = Array.from(keyArray).map(b => b.toString(16).padStart(2, '0')).join('');

            // Generate IV
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            // Encrypt
            const encoder = new TextEncoder();
            const encodedText = encoder.encode(Home.secret);
            const ciphertextBuffer = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                cryptoKey,
                encodedText
            );

            // Combine iv + ciphertext
            const ciphertextArray = new Uint8Array(ciphertextBuffer);
            const combinedArray = new Uint8Array(iv.length + ciphertextArray.length);
            combinedArray.set(iv, 0);
            combinedArray.set(ciphertextArray, iv.length);

            // Convert to base64
            let binaryString = "";
            for (let i = 0; i < combinedArray.length; i++) {
                binaryString += String.fromCharCode(combinedArray[i]);
            }
            const base64Data = btoa(binaryString);

            // Send to server
            const result = await m.request({
                method: "POST",
                url: "/api/secret",
                body: { encrypted_data: base64Data }
            });

            // Build absolute URL
            const url = new URL(window.location.origin);
            url.pathname = "/";
            url.hash = `!/secret/${result.token}/${keyHex}`;
            Home.link = url.toString();
            Home.secret = ""; // clear
            Home.loading = false;
            m.redraw();
        } catch (e) {
            console.error(e);
            Home.loading = false;
            Home.error = e.response?.error || "An error occurred during encryption or upload.";
            m.redraw();
        }
    },

    view: function () {
        return m(".container",
            m(".card", [
                m("h1", "Share a Secret"),
                m("p.subtitle", "Encrypt a message for one-time retrieval."),

                m("form", { onsubmit: Home.createSecret }, [
                    m("textarea", {
                        placeholder: "Type your sensitive information here...",
                        disabled: Home.loading,
                        oninput: function (e) { 
                            Home.secret = e.target.value;
                            Home.link = null;
                            Home.error = null;
                        },
                        value: Home.secret
                    }),
                    m("button[type=submit]", { disabled: Home.loading || !Home.secret.trim() },
                        Home.loading ? "Encrypting..." : "Generate Link"
                    )
                ]),

                Home.error ? m(".error-msg", Home.error) : null,

                Home.link ? m(".result-box", [
                    m("p", { style: "margin-bottom: 0.5rem; color: var(--text-color);" }, "Your one-time link (click to copy or share):"),
                    m("a", {
                        href: Home.link,
                        onclick: (e) => {
                            e.preventDefault();
                            navigator.clipboard.writeText(Home.link);
                            alert("Link copied to clipboard!");
                        }
                    }, Home.link)
                ]) : null
            ])
        );
    }
};

// View Secret Component
const ViewSecret = {
    secret: null,
    loading: true,
    error: null,
    revealed: false,

    oninit: async function (vnode) {
        ViewSecret.secret = null;
        ViewSecret.loading = true;
        ViewSecret.error = null;
        ViewSecret.revealed = false;

        const token = vnode.attrs.token;
        const keyHex = vnode.attrs.key;

        try {
            const result = await m.request({
                method: "POST",
                url: "/api/retrieve",
                body: { token: token }
            });

            // Convert base64 to Uint8Array
            const binaryString = atob(result.encrypted_data);
            const encryptedBytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                encryptedBytes[i] = binaryString.charCodeAt(i);
            }

            // Extract IV (first 12 bytes) and ciphertext
            const iv = encryptedBytes.slice(0, 12);
            const ciphertext = encryptedBytes.slice(12);

            // Import key
            const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            const cryptoKey = await window.crypto.subtle.importKey(
                "raw",
                keyBytes,
                { name: "AES-GCM" },
                false,
                ["decrypt"]
            );

            // Decrypt
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                cryptoKey,
                ciphertext
            );

            const decoder = new TextDecoder();
            ViewSecret.secret = decoder.decode(decryptedBuffer);
            ViewSecret.loading = false;
            m.redraw();
        } catch (e) {
            console.error(e);
            ViewSecret.error = e.response?.error || "Secret not found, already viewed, or decryption failed.";
            ViewSecret.loading = false;
            m.redraw();
        }
    },

    view: function () {
        return m(".container",
            m(".card", [
                m("h1", "View Secret"),

                ViewSecret.loading ? m("p", { style: "text-align: center" }, "Decrypting...") : null,

                ViewSecret.error ? [
                    m(".error-msg", { style: "font-size: 1.1rem; margin-bottom: 1.5rem;" }, ViewSecret.error),
                    m("button", { onclick: () => m.route.set("/") }, "Create New Secret")
                ] : null,

                ViewSecret.secret ? [
                    m("p.warning-text", "⚠️ This message has been destroyed from the server. Save it now if needed."),

                    ViewSecret.revealed ?
                        m(".secret-content", ViewSecret.secret) :
                        m(".secret-hidden", "•••••"),

                    m(".button-group", [
                        !ViewSecret.revealed ? m("button", {
                            onclick: () => ViewSecret.revealed = true
                        }, "Reveal Secret") : null,

                        m("button.secondary", {
                            onclick: () => {
                                navigator.clipboard.writeText(ViewSecret.secret);
                                alert("Copied to clipboard!");
                            }
                        }, "Copy to Clipboard")
                    ]),

                    m("button.secondary", { onclick: () => m.route.set("/"), style: "margin-top: 1.5rem;" }, "Create New Secret")
                ] : null
            ])
        );
    }
};

// Initialize Routing
m.route(document.getElementById("app"), "/", {
    "/": Home,
    "/secret/:token/:key": ViewSecret
});
