$(function() {
    console.log('Ready!')
})

let firstRequestFinished = false
let currentUsers = []
let albumIndex = {}
let dragControl = {
    dragTarget: null,
    dropTarget: null
}

let setupFilter = () => {
    let button = document.getElementsByClassName('search__button')[0]
    button.addEventListener('click', () => {
        filterByText()
    })
}

onload = setupFilter

let filterByText = () => {
    let textField = document.getElementsByClassName('search__input')[0]
    let text = textField.value
    let rows = Array.from(document.getElementsByClassName('table__row'))
    rows.map(row => {
        if (!row.className.includes('table__header') && !row.childNodes[1].innerText.includes(text)) {
            row.classList.add('row__invisible')
        } else {
            row.classList.remove('row__invisible')
        }
    })
}

$.ajax({url: 'https://jsonplaceholder.typicode.com/users?id=1', success: function (result) {
    currentUsers.push(result[0])
    if (firstRequestFinished) {
        populateTables()
    } else {
        firstRequestFinished = true
    }
}})

$.ajax({url: 'https://jsonplaceholder.typicode.com/users?id=2', success: function (result) {
    currentUsers.push(result[0])
    if (firstRequestFinished) {
        populateTables()
    } else {
        firstRequestFinished = true
    }
}})

// let clearTables = () => {
//     let tables = Array.from(document.getElementsByClassName('table'))
//     tables.map(table => {
//         Array.from(table.childNodes).map(row => {
//             if (row.className && !row.className.includes('table__header')) {
//                 table.removeChild(row)
//             }
//         })
//     })
// }

let populateTables = () => {
    let tables = Array.from(document.getElementsByClassName('table'))
    currentUsers.map((user, index) => {
        addAssociatedAlbumsToTable(user, tables[index])
        tables[index].id = user.id
    })
    setupDragAndDrop(tables)
}

let addAssociatedAlbumsToTable = (user, table) => {
    $.ajax({
        url: `https://jsonplaceholder.typicode.com/albums?userId=${user.id}`,
        success: function (albums) {
            albums.map(album => {
                addAlbumToTable(album, table)
                albumIndex[album.id] = album
            })
        }
    })
}

let addAlbumToTable = (album, table) => {
    let row = document.createElement('div')
    row.className = 'table__row'
    row.draggable = true
    row.id = album.id
    row.ondragstart = function () {
        dragControl.dragTarget = this
    }
    row.ondragend = function (event) {
        window.setTimeout(() => {
            if (dragControl.dragTarget && dragControl.dropTarget) {
                finishDragEvent(dragControl.dragTarget, dragControl.dropTarget)
            }
        }, 30)
    }
    let idDiv = document.createElement('div')
    idDiv.className = 'table__cell table__cell--short'
    let titleDiv = document.createElement('div')
    titleDiv.className = 'table__cell'
    idDiv.innerText = album.id
    titleDiv.innerText = album.title
    row.appendChild(idDiv)
    row.appendChild(titleDiv)
    table.appendChild(row)
}

let setupDragAndDrop = tables => {
    tables.map(table => {
        table.ondragover = event.preventDefault()
        table.ondragenter = function () {
            dragControl.dropTarget = table
        }
        table.ondragleave = function () {
            dragControl.dropTarget = table
        }
    })
}

let rowById = id => {
    let rows = Array.from(document.getElementsByClassName('table__row'))
    return rows.filter(row => {
        return row.id == id
    })[0]
}

let tableById = id => {
    let tables = Array.from(document.getElementsByClassName('table'))
    return tables.filter(table => {
        return table.id == id
    })[0]
}

let moveRow = (rowId, destinationId) => {
    let row = rowById(rowId)
    let table = tableById(destinationId)
    row.parentElement.removeChild(row)
    table.appendChild(row)
}

let finishDragEvent = (targetAlbum, targetUser) => {
    $.ajax({
        url: `https://jsonplaceholder.typicode.com/albums/${targetAlbum.id}`,
        type: 'put',
        data: JSON.stringify({
            'user_id': targetUser.id,
        }),
        success: function (data) {
            moveRow(data['id'], JSON.parse(Object.keys(data)[0])['user_id'])
        },
        error: function (error) {
            console.log('Error.')
        }
    })
}
