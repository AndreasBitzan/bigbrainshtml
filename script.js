const butInstall = document.getElementById("butInstall");
const butSend = document.getElementById("butSend");
const butNotifications = document.getElementById("butNotifications");
const butShare = document.getElementById("butShare");

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

butNotifications.addEventListener("click", () => {
  if ("serviceWorker" in navigator) {
    subscribeUser();
  }
});

butShare.addEventListener("click",()=>{
  if (navigator.share) {
    navigator.share({
      title: 'BigBrains',
      text: 'Schau dir diese Zitate an',
      url: 'https://bigbrainspwa.netlify.app/',
    })
      .then(() => console.log('Successful share'))
      .catch((error) => console.log('Error sharing', error));
  }
})

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    console.log("Received message from sw:", event.data);
    if(Array.isArray(event.data)){
      updateCitationUI(event.data);
    }
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
  console.log("Updating Citation UI");
  const citationlist = document.querySelector(".citationlist");
  if (citationlist) {
    citationlist.innerHTML="";
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
  console.log("Getting citations");
  const citations = fetch(`${backendUrl}/citations?_sort=created_at:DESC`)
    .then((response) => response.json())
    .then((data) => {
       updateCitationUI(data);
       if ("serviceWorker" in navigator) {
        navigator.serviceWorker.controller.postMessage(data);
      }
    });
}

getCitations();

function toggleModal(){
  const modal = document.querySelector('.modal');
  if(modal){
    if(modal.classList.contains('modal-visible')){
      modal.classList.remove('modal-visible');
    }else{
    modal.classList.add('modal-visible');
    }
  }
}

function submitCitation(){
  console.log("Submit citation with: ");
  const citationInput = document.querySelector('#citation-input');
  const authorInput = document.querySelector('#author-input');
  if(citationInput && authorInput){
    let citation = citationInput.value;
    let author = authorInput.value;
    if(citation){
      if(!author)author="Unbekannt";
      console.log(citation);
      console.log(author);
      let data = {
        "text": citation,
        "author": author,
        "votes": 0,
      }
      console.log("the data", JSON.stringify(data));
     
      fetch(`${backendUrl}/citations`,{
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
      }).then(response => response.json()).then(data=>{
        citationInput.value="";
        authorInput.value="";
        toggleModal();
        getCitations();
        console.log("Citation saved in api");
      });
    }
  }
}