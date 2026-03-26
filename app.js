let memes = JSON.parse(localStorage.getItem("memes")) || [
  {
    src:"https://picsum.photos/400/500?1",
    caption:"When code finally works 😭",
    likes:0
  },
  {
    src:"https://picsum.photos/400/500?2",
    caption:"Me debugging for 5 hours",
    likes:0
  }
];

function save(){
  localStorage.setItem("memes", JSON.stringify(memes));
}

function render(){
  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  memes.forEach((meme, index)=>{
    const card = document.createElement("div");
    card.className="card";

    card.innerHTML = `
      <img src="${meme.src}">
      <div class="caption">${meme.caption}</div>
      <div class="actions">
        <button onclick="like(${index})">❤️ ${meme.likes}</button>
        <button onclick="share('${meme.src}')">🔗 Share</button>
      </div>
    `;

    feed.appendChild(card);
  });
}

function like(i){
  memes[i].likes++;
  save();
  render();
}

function share(url){
  if(navigator.share){
    navigator.share({url});
  } else {
    alert("Copy this link: " + url);
  }
}

function uploadMeme(){
  const file = document.getElementById("fileInput").files[0];
  const caption = document.getElementById("captionInput").value;

  if(!file) return alert("Select image");

  const reader = new FileReader();
  reader.onload = function(e){
    memes.unshift({
      src:e.target.result,
      caption:caption,
      likes:0
    });
    save();
    render();
  };
  reader.readAsDataURL(file);
}

render();
