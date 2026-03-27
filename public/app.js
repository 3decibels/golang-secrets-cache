// Home Component (Create)
const Home = {
    secret: "",
    loading: false,
    link: null,
    error: null,

    createSecret: function(e) {
        e.preventDefault();
        if (!Home.secret.trim()) return;

        Home.loading = true;
        Home.error = null;
        Home.link = null;

        m.request({
            method: "POST",
            url: "/api/secret",
            body: { secret: Home.secret }
        }).then(function(result) {
            Home.loading = false;
            // Build absolute URL
            const url = new URL(window.location.origin);
            url.pathname = "/";
            url.hash = `!/secret/${result.token}/${result.key}`;
            Home.link = url.toString();
            Home.secret = ""; // clear
        }).catch(function(e) {
            Home.loading = false;
            Home.error = e.response?.error || "An error occurred";
        });
    },

    view: function() {
        return m(".container", 
            m(".card", [
                m("h1", "Share a Secret"),
                m("p.subtitle", "Encrypt a message for one-time retrieval."),
                
                m("form", { onsubmit: Home.createSecret }, [
                    m("textarea", {
                        placeholder: "Type your sensitive information here...",
                        disabled: Home.loading,
                        oninput: function(e) { Home.secret = e.target.value },
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

    oninit: function(vnode) {
        const token = vnode.attrs.token;
        const key = vnode.attrs.key;

        m.request({
            method: "POST",
            url: "/api/retrieve",
            body: { token: token, key: key }
        }).then(function(result) {
            ViewSecret.secret = result.secret;
            ViewSecret.loading = false;
        }).catch(function(e) {
            ViewSecret.error = e.response?.error || "Secret not found or already viewed.";
            ViewSecret.loading = false;
        });
    },

    view: function() {
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
                    m(".secret-content", ViewSecret.secret),
                    m("button", { onclick: () => m.route.set("/") }, "Create New Secret")
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
