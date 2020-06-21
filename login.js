import storage from './storage.js';

const loginEndpoint = 'https://login.exokit.org';
const usersEndpoint = 'https://users.exokit.org';

let loginToken = null;
async function updateLoginToken() {
  const res = await fetch(`${usersEndpoint}/${loginToken.name}`);
  let userObject;
  if (res.ok) {
    userObject = await res.json();
  } else if (res.status === 404) {
    userObject = {
      name: loginToken.name,
      avatarHash: null,
    };
  } else {
    throw new Error(`invalid status code: ${res.status}`);
  }

  const loginEmailStatic = document.getElementById('login-email-static');
  const userName = document.getElementById('user-name');
  const avatarName = document.getElementById('avatar-name');
  loginEmailStatic.innerText = userObject.name;
  userName.innerText = userObject.name;
  avatarName.innerText = userObject.avatarHash !== null ? userObject.avatarHash : 'None';
}
async function doLogin(email, code) {
  const res = await fetch(loginEndpoint + `?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`, {
    method: 'POST',
  });
  if (res.status >= 200 && res.status < 300) {
    const newLoginToken = await res.json();

    await storage.set('loginToken', newLoginToken);

    loginToken = newLoginToken;

    const loginForm = document.getElementById('login-form');
    // document.body.classList.add('logged-in');
    loginForm.classList.remove('phase-1');
    loginForm.classList.remove('phase-2');
    loginForm.classList.add('phase-3');

    await updateLoginToken();

    return true;
  } else {
    return false;
  }
}
async function tryLogin() {
  const localLoginToken = await storage.get('loginToken');
  if (localLoginToken) {
    const res = await fetch(loginEndpoint + `?email=${encodeURIComponent(localLoginToken.email)}&token=${encodeURIComponent(localLoginToken.token)}`, {
      method: 'POST',
    });
    if (res.status >= 200 && res.status < 300) {
      loginToken = await res.json();

      await storage.set('loginToken', loginToken);
    } else {
      await storage.remove('loginToken');

      console.warn(`invalid status code: ${res.status}`);
    }
  }

  const header = document.getElementById('header');
  const loginForm = document.getElementById('login-form');
  loginForm.classList.add('login-form');
  loginForm.innerHTML = `
    <div class=phase-content>
      <div class=login-notice id=login-notice></div>
      <div class=login-error id=login-error></div>
    </div>
    <div class="phase-content phase-1-content">
      <input type=email placeholder="your@email.com" id=login-email>
      <input type=submit value="Log in" class="button highlight">
    </div>
    <div class="phase-content phase-2-content">
      <input type=text placeholder="Verification code" id=login-verification-code>
      <input type=submit value="Verify" class="button highlight">
    </div>
    <div class="phase-content phase-3-content">
      <nav class=user-button id=user-button>
        <img src="favicon.ico">
        <span class=name id=login-email-static></span>
        <input type=submit value="Log out" class="button highlight">
        <div class=user-details id=user-details>
          <div class=label>Alias</div>
          <div class="user-name item" id=user-name></div>
          <div class=label>Avatar</div>
          <div class="avatar-name item" id=avatar-name></div>
          <nav class="button" style="display: none;" id=unwear-button>Unwear</nav>
        </div>
      </nav>
    </div>
    <div class="phase-content phaseless-content">
      <div>Working...</div>
    </div>
  `;

  const userButton = document.getElementById('user-button');
  const userDetails = document.getElementById('user-details');
  const unwearButton = document.getElementById('unwear-button');
  const avatarName = document.getElementById('avatar-name');
  const loginEmail = document.getElementById('login-email');
  const loginVerificationCode = document.getElementById('login-verification-code');
  const loginNotice = document.getElementById('login-notice');
  const loginError = document.getElementById('login-error');
  userButton.addEventListener('click', e => {
    userButton.classList.toggle('open');
  });
  userDetails.addEventListener('click', e => {
    // e.preventDefault();
    e.stopPropagation();
  });
  if (loginToken) {
    await updateLoginToken();

    // document.body.classList.add('logged-in');
    loginForm.classList.add('phase-3');
  } else {
    loginForm.classList.add('phase-1');
  }
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();

    if (loginForm.classList.contains('phase-1') && loginEmail.value) {
      loginNotice.innerHTML = '';
      loginError.innerHTML = '';
      loginForm.classList.remove('phase-1');

      const res = await fetch(loginEndpoint + `?email=${encodeURIComponent(loginEmail.value)}`, {
        method: 'POST',
      })
      if (res.status >= 200 && res.status < 300) {
        loginNotice.innerText = `Code sent to ${loginEmail.value}!`;
        loginForm.classList.add('phase-2');

        return res.blob();
      } else {
        throw new Error(`invalid status code: ${res.status}`);
      }
   } else if (loginForm.classList.contains('phase-2') && loginEmail.value && loginVerificationCode.value) {
      loginNotice.innerHTML = '';
      loginError.innerHTML = '';
      loginForm.classList.remove('phase-2');

      if (await doLogin(loginEmail.value, loginVerificationCode.value)) {
        /* xrEngine.postMessage({
          method: 'login',
          loginToken,
        }); */
      }
    } else if (loginForm.classList.contains('phase-3')) {
      await storage.remove('loginToken');

      window.location.reload();
    }
  });
}

export {
  doLogin,
  tryLogin,
};