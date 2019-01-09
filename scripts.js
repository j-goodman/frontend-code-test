// Define control variables
let firstRequestFinished = false
let currentUsers = []
let albumIndex = {}
let selectControl = {
    start: null,
    end: null,
    table: null,
}
let dragControl = {
    dragTarget: null,
    dropTarget: null
}

// Define methods that set up basic page functionality
let setupDragAndDrop = tables => {
    // Add drag events to tables.
    tables.map(table => {
        table.ondragenter = function () {
            dragControl.dropTarget = table
        }
        table.ondragleave = function () {
            dragControl.dropTarget = table
        }
    })
}

let setupFilter = () => {
    // Set up filter inputs at the top of the table to make non-matching
    // rows invisible on text input.
    let filterInputs = document.getElementsByClassName('filter__input')
    Array.from(filterInputs).map(input => {
        input.addEventListener('keyup', () => {
            filterByText(input.value, input.parentElement.parentElement)
        })
    })
}

let setupSelector = () => {
    // Set up rows to be bulk selectable
    let rows = Array.from(document.getElementsByClassName('table__row'))
    rows.map(row => {
        row.removeEventListener('mousedown', beckon)
        row.addEventListener('mousedown', beckon)
        row.removeEventListener('mouseup', rowClickEvent)
        row.addEventListener('mouseup', rowClickEvent)
    })
}

let setupUserSearch = () => {
    // Set up user search bar to request users and filter by name
    let button = document.getElementsByClassName('search__button')[0]
    let searchbar = document.getElementsByClassName('search__input')[0]
    button.addEventListener('click', searchUsers)
    searchbar.addEventListener('keydown', key => {
        if (key.code === 'Enter') {
            searchUsers()
        }
    })
}

// Define other methods
let addAlbumToTable = (album, table) => {
    // Add a given album to a given table with drag events.
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

let addAssociatedAlbumsToTable = (user, table) => {
    // Add the albums associated with a given user to a given table.
    $.ajax({
        url: `https://jsonplaceholder.typicode.com/albums?userId=${user.id}`,
        success: function (albums) {
            albums.map(album => {
                addAlbumToTable(album, table)
                albumIndex[album.id] = album
            })
            setupSelector()
        }
    })
}

let beckon = function () {
    // Add a class to the other table telling the user to drop albums there.
    let dropzone = Array.from(document.getElementsByClassName('table')).filter(table => {
        return table.id !== this.parentElement.id
    })[0]
    dropzone.classList.add('table__beckoning')
    document.addEventListener('mouseup', () => {
        dropzone.classList.remove('table__beckoning')
    })
}

let clearSelected = rows => {
    // Clear which rows have been bulk-selected by the user.
    rows = rows ? rows : Array.from(document.getElementsByClassName('table__row'))
    selectControl.start = selectControl.end = selectControl.table = null
    rows.map(row => {
      row.classList.remove('row__selected')
    })
}

let clearTables = () => {
    // Clear information from existing tables.
    let tables = Array.from(document.getElementsByClassName('table'))
    tables.map(table => {
        Array.from(table.childNodes).map(row => {
            if (row.className && row.className.includes('table__row')) {
                table.removeChild(row)
            }
        })
    })
}

let filterByText = (text, table) => {
    // Filter the contents of a table by a given string.
    let rows = Array.from(table.getElementsByClassName('table__row'))
    rows.map(row => {
        if (!row.childNodes[1].innerText.includes(text)) {
            row.classList.add('row__invisible')
        } else {
            row.classList.remove('row__invisible')
        }
    })
}

let finishDragEvent = (targetAlbum, targetUser) => {
    // Update selection controls and begin album move process.
    if (selectControl.end === null) {
        moveAlbum(targetAlbum, targetUser)
    } else {
        Array.from(document.getElementsByClassName('row__selected')).map(row => {
            if (!row.className.includes('row__invisible')) {
                moveAlbum(row, targetUser)
            }
        })
    }
    targetUser.classList.remove('table__beckoning')
    clearSelected()
}

let moveAlbum = (targetAlbum, targetUser) => {
    // Move an album from one user's table to another.
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

let moveRow = (rowId, destinationId) => {
    // Move the HTML element representing an album from one table to another.
    let row = rowById(rowId)
    let table = tableById(destinationId)
    row.parentElement.removeChild(row)
    table.appendChild(row)
}

let populateTables = () => {
    // Populate the tables with the currently displayed users' albums.
    let tables = Array.from(document.getElementsByClassName('table'))
    currentUsers.map((user, index) => {
        addAssociatedAlbumsToTable(user, tables[index])
        tables[index].getElementsByClassName(
            'table__label'
        )[0].innerText = user.name
        tables[index].id = user.id
    })
    setupDragAndDrop(tables)
    setupUserSearch()
}

let rowById = id => {
    // Return the row matching a given id.
    let rows = Array.from(document.getElementsByClassName('table__row'))
    return rows.filter(row => {
        return row.id == id
    })[0]
}

let rowClickEvent = function () {
    // Allow for bulk-selecting rows by determining whether the clicked row
    // creates a valid range with the already-clicked row. If it does, select
    // the indicated rows.
    let tableId = this.parentElement.id
    let rows = Array.from(document.getElementsByClassName('table__row'))
    if (selectControl.start === null) {
        selectControl.start = rowIndex(this)
        this.classList.add('row__selected')
        selectControl.table = tableId
    } else if (selectControl.table === tableId &&
    rowIndex(this) >= selectControl.start && selectControl.end === null) {
        selectControl.end = rowIndex(this)
    } else {
        clearSelected(rows)
        rowClickEvent.bind(this)()
    }
    if (selectControl.start !== null && selectControl.end !== null) {
        rows.map(row => {
            if (row.parentElement.id === selectControl.table &&
            rowIndex(row) >= selectControl.start &&
            rowIndex(row) <= selectControl.end) {
                row.classList.add('row__selected')
            }
        })
    }
}

let rowIndex = row => {
    // Return the index of a given row within its table.
    return Array.prototype.indexOf.call(
        row.parentElement.getElementsByClassName('table__row'), row
    )
}

let tableById = id => {
    // Return the table matching a given id.
    let tables = Array.from(document.getElementsByClassName('table'))
    return tables.filter(table => {
        return table.id == id
    })[0]
}

let searchUsers = () => {
    // Check whether a user matching the name string in the search bar exists,
    // then if that user is not currently displayed, display it.
    let searchbar = document.getElementsByClassName('search__input')[0]
    let message = document.getElementsByClassName('search__message')[0]
    $.ajax({
            url: `https://jsonplaceholder.typicode.com/users?name=${searchbar.value}`,
            success: function (result) {
                if (result.length === 0) {
                    message.innerText =
                    `

                    We couldn't find a user named ${searchbar.value}.
                    User's name must be an exact match.`
                } else {
                    if (currentUsers.map(user => {
                        return user.name
                    }).includes (result[0].name)) {
                        message.innerText =
                        `

                         ${result[0].name}'s albums are already being displayed.`
                    } else {
                        console.log(2)
                        currentUsers.shift()
                        currentUsers.push(result[0])
                        clearTables()
                        populateTables()
                        message.innerText = `

                        Displaying ${result[0].name}'s albums.`
                    }
                }
                window.setTimeout(() => {
                    message.innerText = ``
                }, 5000)
            }
        }
    )
}

// Set up filtering on pageload
onload = setupFilter

// Request users
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
