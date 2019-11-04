const electron = require('electron');
const { ipcRenderer } = electron;
const ul = document.querySelector('ul');
const navWrapper = document.querySelector('.nav-wrapper');
const dbContainer = document.querySelector("#db-container");

ipcRenderer.on('redis:connected', function (e, data) {
    const { dbstats } = data;
    for (const key in dbstats) {
        const button = document.createElement('button');
        button.setAttribute('class', 'btn waves-effect waves-light');
        button.setAttribute('name', 'action');
        button.setAttribute('type', 'submit');
        button.value = key;
        button.innerText = `DB ${key}`;
        button.addEventListener('click', function () {
            ul.className = '';
            ul.innerHTML = '';
            resetSearch();
            ipcRenderer.send('redis:changeDb', key);
        })
        dbContainer.appendChild(button);
    }
    navWrapper.innerHTML = `
      <form>
        <div class="input-field">
          <input id="search" type="search" onkeyup="myFunction()" placeholder="Search for names.." >
          <label class="label-icon" for="search"><i class="material-icons">search</i></label>
          <i class="material-icons" onClick="resetSearch()">close</i>
        </div>
      </form>
      `;
});

ipcRenderer.on('redis:keys', function (e, keys) {
    ul.innerHTML = '';
    ul.className = 'collection';
    keys.forEach(key => {
        const li = document.createElement('li');
        li.className = 'collection-item';
        const itemText = document.createTextNode(key);
        const iconText = document.createTextNode('delete');

        const liInnerDiv = document.createElement('div');
        const span = document.createElement('span');
        const anchor = document.createElement('a');
        const icon = document.createElement('i');

        anchor.className = 'secondary-content';
        anchor.href = '#!';
        icon.className = 'material-icons';

        anchor.addEventListener('click', function (e) {
            const result = confirm("Want to delete?");
            if (!result) {
                return;
            }
            const itemDiv = e.target.parentElement.parentElement;
            const item = itemDiv.children[0].innerText;
            ipcRenderer.send('redis:delete', item);
            ipcRenderer.once('redis:deleted', (data) => {
                const li = itemDiv.parentElement;
                li.remove();
                if (ul.children.length == 0) {
                    ul.className = '';
                }
            });
        })

        span.appendChild(itemText);
        icon.appendChild(iconText);
        anchor.appendChild(icon);
        liInnerDiv.appendChild(span);
        liInnerDiv.appendChild(anchor);

        li.appendChild(liInnerDiv);
        ul.appendChild(li);
    });
});

ipcRenderer.on('redis:disconnected', function () {
    navWrapper.innerHTML = '<a class="brand-logo center">Disconnected</a>';
    dbContainer.innerHTML = '';
    ul.className = '';
    ul.innerHTML = '';
});

const myFunction = () => {
    let filter, ul, li, a, i, txtValue;
    const searchInput = document.querySelector("#search");
    filter = searchInput.value.toUpperCase();
    ul = document.querySelector("ul");
    li = ul.getElementsByTagName("li");
    for (i = 0; i < li.length; i++) {
        span = li[i].getElementsByTagName("span")[0];
        txtValue = span.textContent || span.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            li[i].style.display = "";
        } else {
            li[i].style.display = "none";
        }
    }
}

const resetSearch = () => {
    const searchInput = document.querySelector("#search");
    searchInput.value = "";
    myFunction();
}

    // ul.addEventListener('dblclick', function (e) {
    //   const item = e.target.innerText.toString();
    //   ipcRenderer.send('redis:openItem', item);
    // });