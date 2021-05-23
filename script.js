const butInstall = document.getElementById("butInstall");
const butSend = document.getElementById("butSend");
const butNotifications = document.getElementById("butNotifications");
const applicationServerPublicKey =
  "BMb2C7391jjVfkZN5RKmVubD1JRvzobSacs4axsEKXHgNfGp_aThfJFMV2l3QpO5hlFids9WcrZz4pxOru1P8hc";
const backendUrl = "https://boiling-headland-95835.herokuapp.com";

let defferredPrompt;
let swRegistration = null;

function urlB64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

window.addEventListener("beforeinstallprompt", (e) => {
  console.log("Installation event fired");
  e.preventDefault();

  defferredPrompt = e;
  return false;
});

butInstall.addEventListener("click", () => {
  if (defferredPrompt) {
    defferredPrompt.prompt();

    defferredPrompt.userChoice.then((res) => {
      if (res.outcome == "dismissed") {
        console.log("User canceled installation");
      } else {
        console.log("User installed app");
      }
    });
  }
});

butSend.addEventListener("click", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.controller.postMessage({
      name: "Tarik",
      surname: "Huber",
    });
    console.log("Message send");
  }
});

butNotifications.addEventListener("click", () => {
  if ("serviceWorker" in navigator) {
    subscribeUser();
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    console.log("Received message from sw:", event.data);
  });
}

const listenForWaitingServiceWorker = (reg, callback) => {
  function awaitStateChange() {
    reg.installing.addEventListener("statechange", function () {
      if (this.state === "installed") callback(reg);
    });
  }
  if (!reg) return;
  if (reg.waiting) return callback(reg);
  if (reg.installing) awaitStateChange();
  reg.addEventListener("updatefound", awaitStateChange);
};

const showUpdateButton = (reg) => {
  if (reg) {
    let button = document.querySelector("#update");
    button.addEventListener("click", () => {
      reg.waiting.postMessage("skipWaiting");
    });
    button.style.display = "inline";
  }
};

if ("serviceWorker" in navigator) {
  console.log("we support SW");
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      swRegistration = reg;
      listenForWaitingServiceWorker(reg, showUpdateButton);
    });
  });
}

let refreshing;
navigator.serviceWorker.addEventListener("controllerchange", () => {
  if (refreshing) return;
  refreshing = true;
  window.location.reload(true);
});

function askPermission() {
  return new Promise(function (resolve, reject) {
    const permissionResult = Notification.requestPermission(function (result) {
      resolve(result);
    });

    if (permissionResult) {
      permissionResult.then(resolve, reject);
    }
  }).then(function (permissionResult) {
    if (permissionResult !== "granted") {
      throw new Error("We weren't granted permission.");
    }
    console.log("Permission granted");
  });
}

function updateWebPushUI() {
  getSWRegistration()
    .then(function (reg) {
      return reg.pushManager.getSubscription();
    })
    .then(function (sub) {
      cbSubscribed.checked = !!sub;
      sendSubscriptionToServer(sub);
    });
}

function subscribeUser() {
  const applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);

  swRegistration.pushManager
    .subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    })
    .then(function (subscription) {
      console.log("User is subscribed.");

      updateSubscriptionOnServer(subscription);

      isSubscribed = true;

      // updateBtn();
    })
    .catch(function (err) {
      console.log("Failed to subscribe the user: ", err);
      // updateBtn();
    });
}

function updateSubscriptionOnServer(subscription) {
  console.log(JSON.stringify(subscription));
  const subscriptionJson = document.querySelector(".js-subscription-json");

  if (subscription) {
    subscriptionJson.textContent = "Subscription JSON ist im Console Ouput";
  }
}

function updateCitationUI(citations) {
  const citationlist = document.querySelector(".citationlist");
  if (citationlist) {
    citations.forEach((citation) => {
      let listItem = document.createElement("li");
      listItem.classList.add("citation");
      let citationlogo = document.createElement("div");
      citationlogo.classList.add("citationlogo");
      let citationtext = document.createElement("p");
      citationtext.classList.add("citationtext");
      citationtext.innerHTML=citation.text;
      let citationauthor = document.createElement("p");
      citationauthor.classList.add("citationauthor");
      citationauthor.innerHTML=`- ${citation.author}`;
      listItem.appendChild(citationlogo);
      listItem.appendChild(citationtext);
      listItem.appendChild(citationauthor);
      citationlist.appendChild(listItem);
    });
  }
}

function getCitations() {
  const citations = fetch(`${backendUrl}/citations?_sort=created_at:DESC`)
    .then((response) => response.json())
    .then((data) => updateCitationUI(data));
}

console.log("CITATIONS");
console.log(getCitations());
