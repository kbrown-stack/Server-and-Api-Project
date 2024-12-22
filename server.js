const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST_NAME = "localhost";
const PORT = 4000;
const dataFilePath = path.join(__dirname, "items.json");

function requestListener(req, res) {
  const method = req.method;
  const urlParts = req.url.split("/").filter(Boolean);
  const url = req.url;

  // To determine which  Static file to serve based on the URL

  if (url === "/" || url === "/index.html" || url === "/random.html") {
    const fileName = url === "/" ? "index.html" : url.slice(1);
    filepath = path.join(__dirname, fileName);

    // Now read the html files

    fs.readFile(filepath, (err, data) => {
      if (err) {
        console.error(
          `Error occured while reading the file: ${filepath}`,
          err.message
        );
        res.writeHead(404, { "content-type": "text/html" });
        res.end("<h1>404 ! Page not available</h1>");
        //   return;
      } else {
        res.writeHead(200, { "Content-type": "text/html" });

        res.end(data);
      }
    });
    return;
  }

  // Route Calls for the Apis method Handling.

  if (urlParts[0] === "api" && urlParts[1] === "items") {
    if (method === "GET" && urlParts.length === 2) {
      // Get all items
      return getAllItems(res);
    } else if (method === "GET" && urlParts.length === 3) {
      // Get one item by ID
      const id = urlParts[2];
      return getItemById(res, id);
    } else if (method === "POST" && urlParts.length === 2) {
      // Create a new item
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => createItem(res, body));
      return;
    } else if (method === "PUT" && urlParts.length === 3) {
      // Update an item by ID
      const id = urlParts[2];
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => updateItem(res, id, body));
      return;
    } else if (method === "DELETE" && urlParts.length === 3) {
      // Delete an item by ID
      const id = urlParts[2];
      return deleteItem(res, id);
    }
    return sendResponse(res, 404, {
      success: false,
      message: "Route not found",
    });
  }

  // This is for all routes not same.
  sendResponse(res, 404, { success: false, message: "Route not found" });
}

//  Functions to handle all API's

//  getAllItems function for Api calls

function getAllItems(res) {
  fs.readFile(dataFilePath, "utf-8", (err, data) => {
    if (err) {
      console.error("Error reading file:", err.message);
      return sendResponse(res, 500, {
        success: false,
        message: "Failed to read items",
      });
    }

    const items = data ? JSON.parse(data) : [];
    return sendResponse(res, 200, { success: true, data: items });
  });
}

//GetItem by ID fuction for Api calls

function getItemById(res, id) {
  fs.readFile(dataFilePath, "utf-8", (err, data) => {
    if (err) {
      console.error("Error reading items.json:", err.message);
      return sendResponse(res, 500, {
        success: false,
        message: "Failed to read items",
      });
    }

    const items = JSON.parse(data || "[]"); //  use an empty array || parse json file
    const item = items.find((item) => item.id === id); // Finding item with the matching id

    if (item) {
      sendResponse(res, 200, { success: true, data: item });
    } else {
      sendResponse(res, 404, {
        success: false,
        message: `Item with id ${id} not found`,
      });
    }
  });
}

// Create Item Function Api calls

function createItem(res, body) {
  try {
    const { name, price, size } = JSON.parse(body);
    if (!name || !price || !size || !["s", "m", "l"].includes(size)) {
      return sendResponse(res, 400, {
        success: false,
        message: "Invalid item attributes",
      });
    }
    const items = readItemsFromFile();
    const newItem = { id: Date.now().toString(), name, price, size };
    items.push(newItem);
    writeItemsToFile(items);
    sendResponse(res, 201, { success: true, data: newItem });
  } catch (err) {
    sendResponse(res, 400, { success: false, message: "Invalid JSON" });
  }
}

// Update Function for Api calls

function updateItem(res, id, body) {
  try {
    const { name, price, size } = JSON.parse(body);
    const items = readItemsFromFile();
    const itemIndex = items.findIndex((item) => item.id === id);
    if (itemIndex === -1) {
      return sendResponse(res, 404, {
        success: false,
        message: "Item not found",
      });
    }

    if (name) items[itemIndex].name = name;
    if (price) items[itemIndex].price = price;
    if (size && ["s", "m", "l"].includes(size)) items[itemIndex].size = size;

    writeItemsToFile(items);
    sendResponse(res, 200, { success: true, data: items[itemIndex] });
  } catch (err) {
    sendResponse(res, 400, { success: false, message: "Invalid JSON" });
  }
}

// Delete functions for api calls.

function deleteItem(res, id) {
  const items = readItemsFromFile();
  const filteredItems = items.filter((item) => item.id !== id);

  if (filteredItems.length === items.length) {
    return sendResponse(res, 404, {
      success: false,
      message: "Item not found",
    });
  }

  writeItemsToFile(filteredItems);
  sendResponse(res, 200, { success: true, message: "Item deleted" });
}

// Functions to detemine the which file (json) to serve based on the items presented.

function readItemsFromFile() {
  try {
    const data = fs.readFileSync(dataFilePath, "utf8");
    return JSON.parse(data || "[]"); // This returns empty array if the file is empty
  } catch (err) {
    console.error("Error reading items.json:", err);
    return [];
  }
}

function writeItemsToFile(items) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(items, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing to items.json:", err);
  }
}

function sendResponse(res, statusCode, payload) {
  if (res.headersSent) {
    console.error("Headers already sent!");
    return;
  }
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(requestListener);

server.listen(PORT, HOST_NAME, () => {
  console.log(
    `Server started successfully and running  at http://${HOST_NAME}:${PORT}`
  );
});
