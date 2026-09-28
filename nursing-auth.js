(() => {
  const EXPECTED = "8a2342ea25e7f82110fe4ae926779f1019bca9acfe9216dad96b0873ddcd724f";
  const SESSION_KEY = "siahverse_nursing_auth_v1";

  const hex = buffer => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");

  async function sha256(value) {
    const data = new TextEncoder().encode(value);
    return hex(await crypto.subtle.digest("SHA-256", data));
  }

  function unlock() {
    document.documentElement.classList.remove("nursing-auth-pending");
    document.getElementById("nursingAuthGate")?.remove();
  }

  function gate() {
    if (sessionStorage.getItem(SESSION_KEY) === EXPECTED) {
      unlock();
      return;
    }

    const wrap = document.createElement("div");
    wrap.id = "nursingAuthGate";
    wrap.innerHTML = `
      <div class="nag-card" role="dialog" aria-modal="true" aria-labelledby="nagTitle">
        <div class="nag-logo">S</div>
        <div class="nag-kicker">Siahverse</div>
        <h1 id="nagTitle">Nursing Resources</h1>
        <p>Enter the class password to continue.</p>
        <form id="nagForm">
          <label for="nagPassword">Password</label>
          <div class="nag-input-row">
            <input id="nagPassword" type="password" autocomplete="current-password" autofocus required>
            <button type="button" id="nagShow" class="nag-secondary" aria-label="Show password">Show</button>
          </div>
          <div id="nagError" class="nag-error" role="status" aria-live="polite"></div>
          <button type="submit" class="nag-primary">Unlock</button>
        </form>
      </div>`;

    document.body.prepend(wrap);
    document.documentElement.classList.add("nursing-auth-pending");

    const form = document.getElementById("nagForm");
    const input = document.getElementById("nagPassword");
    const error = document.getElementById("nagError");
    const show = document.getElementById("nagShow");

    show.addEventListener("click", () => {
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      show.textContent = visible ? "Show" : "Hide";
      show.setAttribute("aria-label", visible ? "Show password" : "Hide password");
      input.focus();
    });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const button = form.querySelector(".nag-primary");
      error.textContent = "";
      button.disabled = true;
      button.textContent = "Checking…";
      try {
        const digest = await sha256(input.value);
        if (digest === EXPECTED) {
          sessionStorage.setItem(SESSION_KEY, EXPECTED);
          unlock();
        } else {
          error.textContent = "Incorrect password.";
          input.select();
        }
      } catch {
        error.textContent = "Unable to verify the password in this browser.";
      } finally {
        button.disabled = false;
        button.textContent = "Unlock";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", gate, { once: true });
  } else {
    gate();
  }
})();