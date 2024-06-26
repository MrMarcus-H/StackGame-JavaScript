window.focus(); // This line of code sets the focus on the current window. This is done so that any key events are immediately captured by the window.

let camera, scene, renderer; // These are global variables that will be used for the Three.js library. camera will be used to control the viewpoint of the game, scene will contain all the objects to be rendered, and renderer will be used to display the scene to the user.
let world; // This is a global variable that will be used for the Cannon.js physics engine. It will contain all the physical objects and control how they interact.
let lastTime; // This variable will be used to keep track of the timestamp of the last animation frame. This is typically used in the animation loop to calculate the time difference between frames.
let stack; // This variable will hold the parts of the game that stay solid on top of each other.
let overhangs; // This variable will hold the parts of the game that overhang and fall down.
const boxHeight = 1; // This constant defines the height of each layer in the game.
const originalBoxSize = 3; // his constant defines the original width and height of a box in the game.
let autopilot; // This variable will be used to determine if the game is in autopilot mode or not.
let gameEnded; // This variable will be used to determine if the game has ended or not.
let robotPrecision; // This variable will be used to determine how precise the game is on autopilot.

// Get the element with the id "score" and assign it to the variable scoreElement
const scoreElement = document.getElementById("score");

// Get the element with the id "instructions" and assign it to the variable instructionsElement
const instructionsElement = document.getElementById("instructions");

// Get the element with the id "results" and assign it to the variable resultsElement
const resultsElement = document.getElementById("results");

init(); // Call the init function to initialize the game.

// Determines how precise the game is on autopilot
function setRobotPrecision() {
  robotPrecision = Math.random() * 1 - 0.5;
}

function init() {
  autopilot = true; // Set the autopilot flag to true
  gameEnded = false; // Set the gameEnded flag to false
  lastTime = 0; // Initialize the lastTime variable to 0
  stack = []; // Initialize an empty array called stack to store the layers
  overhangs = []; // Initialize an empty array called overhangs to store the overhangs
  setRobotPrecision(); // Call the setRobotPrecision function to set the robot's precision

  // Initialize CannonJS
  world = new CANNON.World(); // Create a new instance of the CannonJS World
  world.gravity.set(0, -10, 0); // Set the gravity of the world to pull things down
  world.broadphase = new CANNON.NaiveBroadphase(); // Use the NaiveBroadphase collision detection algorithm
  world.solver.iterations = 40; // Set the number of solver iterations for the physics simulation

  // Initialize ThreeJs
  const aspect = window.innerWidth / window.innerHeight; // Calculate the aspect ratio of the window
  const width = 10; // Set the width of the OrthographicCamera
  const height = width / aspect; // Calculate the height based on the aspect ratio

  camera = new THREE.OrthographicCamera(
    width / -2, // Set the left boundary of the camera frustum
    width / 2, // Set the right boundary of the camera frustum
    height / 2, // Set the top boundary of the camera frustum
    height / -2, // Set the bottom boundary of the camera frustum
    0, // Set the near plane of the camera frustum
    100 // Set the far plane of the camera frustum
  );

  /*
  // If you want to use perspective camera instead, uncomment these lines
  camera = new THREE.PerspectiveCamera(
    45, // Set the field of view of the camera
    aspect, // Set the aspect ratio of the camera
    1, // Set the near plane of the camera frustum
    100 // Set the far plane of the camera frustum
  );
  */

  camera.position.set(4, 4, 4); // Set the position of the camera
  camera.lookAt(0, 0, 0); // Set the target of the camera to look at the origin (0, 0, 0)

  scene = new THREE.Scene(); // Create a new instance of the ThreeJS Scene

  // Foundation
  addLayer(0, 0, originalBoxSize, originalBoxSize); // Add the foundation layer to the stack

  // First layer
  addLayer(-10, 0, originalBoxSize, originalBoxSize, "x"); // Add the first layer to the stack with a specific direction

  // Set up lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Create an ambient light with a color and intensity
  scene.add(ambientLight); // Add the ambient light to the scene

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6); // Create a directional light with a color and intensity
  dirLight.position.set(10, 20, 0); // Set the position of the directional light
  scene.add(dirLight); // Add the directional light to the scene

  // Set up renderer
  renderer = new THREE.WebGLRenderer({ antialias: true }); // Create a new instance of the WebGLRenderer with antialiasing enabled
  renderer.setSize(window.innerWidth, window.innerHeight); // Set the size of the renderer to match the window size
  renderer.setAnimationLoop(animation); // Set the animation loop function to be called by the renderer
  document.body.appendChild(renderer.domElement); // Append the renderer's DOM element to the document body
}
function startGame() {
  // Resetting game variables
  autopilot = false; // Set autopilot to false
  gameEnded = false; // Set gameEnded to false
  lastTime = 0; // Reset lastTime to 0
  stack = []; // Clear the stack array
  overhangs = []; // Clear the overhangs array

  // Hide instructions, results, and reset score
  if (instructionsElement) instructionsElement.style.display = "none";
  if (resultsElement) resultsElement.style.display = "none";
  if (scoreElement) scoreElement.innerText = 0;

  // Clear the world of objects
  if (world) {
    // Remove every object from the world
    while (world.bodies.length > 0) {
      world.remove(world.bodies[0]);
    }
  }

  // Clear the scene of meshes
  if (scene) {
    // Remove every Mesh from the scene
    while (scene.children.find((c) => c.type == "Mesh")) {
      const mesh = scene.children.find((c) => c.type == "Mesh");
      scene.remove(mesh);
    }

    // Add the foundation layer
    addLayer(0, 0, originalBoxSize, originalBoxSize);

    // Add the first layer
    addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");
  }

  // Reset camera positions
  if (camera) {
    camera.position.set(4, 4, 4);
    camera.lookAt(0, 0, 0);
  }
}

function addLayer(x, z, width, depth, direction) {
  // Calculate the y position for the new layer. It's based on the box height multiplied by the current stack length
  const y = boxHeight * stack.length;

  // Generate a new box with the provided dimensions and position, and assign it to the variable "layer"
  const layer = generateBox(x, y, z, width, depth, false);

  // Assign the direction to the "direction" property of the layer
  layer.direction = direction;

  // Add the new layer to the end of the stack
  stack.push(layer);
}

function addOverhang(x, z, width, depth) {
  // Calculate the y position for the overhang. It's based on the box height multiplied by the current stack length minus one
  const y = boxHeight * (stack.length - 1);

  // Generate a new box with the provided dimensions and position, and assign it to the variable "overhang"
  const overhang = generateBox(x, y, z, width, depth, true);

  // Add the new overhang to the end of the overhangs array
  overhangs.push(overhang);
}

function generateBox(x, y, z, width, depth, falls) {
  // ThreeJS
  // Create a box geometry with the provided width, a predefined box height, and the provided depth
  const geometry = new THREE.BoxGeometry(width, boxHeight, depth);

  // Generate a color for the box based on the current stack length
  const color = new THREE.Color(`hsl(${30 + stack.length * 4}, 100%, 50%)`);

  // Create a material with the generated color
  const material = new THREE.MeshLambertMaterial({ color });

  // Create a mesh using the geometry and material
  const mesh = new THREE.Mesh(geometry, material);

  // Set the position of the mesh
  mesh.position.set(x, y, z);

  // Add the mesh to the scene
  scene.add(mesh);

  // CannonJS
  // Create a box shape for the physics body
  const shape = new CANNON.Box(
    new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2)
  );

  // If the box should fall, set its mass to 5, otherwise set it to 0
  let mass = falls ? 5 : 0;

  // Adjust the mass based on the size of the box
  mass *= width / originalBoxSize; // Reduce mass proportionately by width
  mass *= depth / originalBoxSize; // Reduce mass proportionately by depth

  // Create a physics body with the calculated mass and the box shape
  const body = new CANNON.Body({ mass, shape });

  // Set the position of the physics body
  body.position.set(x, y, z);

  // Add the physics body to the world
  world.addBody(body);

  // Return an object containing the ThreeJS mesh, the CannonJS body, and the width and depth of the box
  return {
    threejs: mesh,
    cannonjs: body,
    width,
    depth,
  };
}

function cutBox(topLayer, overlap, size, delta) {
  // Determine the direction of the cut
  const direction = topLayer.direction;

  // Calculate the new width and depth based on the direction and overlap
  const newWidth = direction == "x" ? overlap : topLayer.width;
  const newDepth = direction == "z" ? overlap : topLayer.depth;

  // Update the width and depth of the top layer
  topLayer.width = newWidth;
  topLayer.depth = newDepth;

  // Update the scale and position of the ThreeJS model
  topLayer.threejs.scale[direction] = overlap / size;
  topLayer.threejs.position[direction] -= delta / 2;

  // Update the position of the CannonJS model
  topLayer.cannonjs.position[direction] -= delta / 2;

  // Create a new, smaller shape for the CannonJS model
  const shape = new CANNON.Box(
    new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2)
  );

  // Remove the old shape from the CannonJS model and add the new one
  // This is necessary because in CannonJS, you can't simply scale a shape - you have to replace it with a new one
  topLayer.cannonjs.shapes = [];
  topLayer.cannonjs.addShape(shape);
}

// Add an event listener for the "mousedown" event
// When the user presses down on the mouse button, the `eventHandler` function is called
window.addEventListener("mousedown", eventHandler);

// Add an event listener for the "touchstart" event
// When the user touches the screen (on a touch-enabled device), the `eventHandler` function is called
window.addEventListener("touchstart", eventHandler);

// Add an event listener for the "keydown" event
window.addEventListener("keydown", function (event) {
  // If the user presses the space bar
  if (event.key == " ") {
    // Prevent the default action (scrolling)
    event.preventDefault();
    // Call the `eventHandler` function
    eventHandler();
    return;
  }
  // If the user presses the "R" or "r" key
  if (event.key == "R" || event.key == "r") {
    // Prevent the default action
    event.preventDefault();
    // Call the `startGame` function
    startGame();
    return;
  }
});

function eventHandler() {
  // If the autopilot mode is enabled
  if (autopilot) {
    // Start the game
    startGame();
  } else {
    // If autopilot mode is not enabled, split the block and add the next one if it overlaps
    splitBlockAndAddNextOneIfOverlaps();
  }
}

function splitBlockAndAddNextOneIfOverlaps() {
  // If the game has ended, exit the function
  if (gameEnded) return;

  // Get the top layer and the previous layer from the stack
  const topLayer = stack[stack.length - 1];
  const previousLayer = stack[stack.length - 2];

  // Get the direction of the cut
  const direction = topLayer.direction;

  // Calculate the size of the cut and the difference in position between the top layer and the previous layer
  const size = direction == "x" ? topLayer.width : topLayer.depth;
  const delta =
    topLayer.threejs.position[direction] -
    previousLayer.threejs.position[direction];
  const overhangSize = Math.abs(delta);
  const overlap = size - overhangSize;

  // If there is an overlap
  if (overlap > 0) {
    // Cut the box
    cutBox(topLayer, overlap, size, delta);

    // Calculate the position and size of the overhang
    const overhangShift = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
    const overhangX =
      direction == "x"
        ? topLayer.threejs.position.x + overhangShift
        : topLayer.threejs.position.x;
    const overhangZ =
      direction == "z"
        ? topLayer.threejs.position.z + overhangShift
        : topLayer.threejs.position.z;
    const overhangWidth = direction == "x" ? overhangSize : topLayer.width;
    const overhangDepth = direction == "z" ? overhangSize : topLayer.depth;

    // Add the overhang to the game
    addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);

    // Calculate the position and size of the next layer
    const nextX = direction == "x" ? topLayer.threejs.position.x : -10;
    const nextZ = direction == "z" ? topLayer.threejs.position.z : -10;
    const newWidth = topLayer.width; // New layer has the same size as the cut top layer
    const newDepth = topLayer.depth; // New layer has the same size as the cut top layer
    const nextDirection = direction == "x" ? "z" : "x";

    // Update the score
    if (scoreElement) scoreElement.innerText = stack.length - 1;

    // Add the next layer to the game
    addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
  } else {
    // If there is no overlap, the player missed the spot
    missedTheSpot();
  }
}

function missedTheSpot() {
  // Get the top layer from the stack
  const topLayer = stack[stack.length - 1];

  // Turn the top layer into an overhang and let it fall down
  addOverhang(
    topLayer.threejs.position.x,
    topLayer.threejs.position.z,
    topLayer.width,
    topLayer.depth
  );

  // Remove the top layer from the physics world and the scene
  world.remove(topLayer.cannonjs);
  scene.remove(topLayer.threejs);

  // Set the game to ended
  gameEnded = true;

  // If there is a results element and the game is not in autopilot mode, display the results
  if (resultsElement && !autopilot) resultsElement.style.display = "flex";
}

function animation(time) {
  // If lastTime is defined
  if (lastTime) {
    // Calculate the time passed since the last frame and set the speed of the animation
    const timePassed = time - lastTime;
    const speed = 0.008;

    // Get the top layer and the previous layer from the stack
    const topLayer = stack[stack.length - 1];
    const previousLayer = stack[stack.length - 2];

    // Determine if the top box should move
    const boxShouldMove =
      !gameEnded &&
      (!autopilot ||
        (autopilot &&
          topLayer.threejs.position[topLayer.direction] <
            previousLayer.threejs.position[topLayer.direction] +
              robotPrecision));

    // If the box should move
    if (boxShouldMove) {
      // Update the position of the top layer in both the UI and the model
      topLayer.threejs.position[topLayer.direction] += speed * timePassed;
      topLayer.cannonjs.position[topLayer.direction] += speed * timePassed;

      // If the box went beyond the stack, end the game
      if (topLayer.threejs.position[topLayer.direction] > 10) {
        missedTheSpot();
      }
    } else {
      // If the box shouldn't move and the game is in autopilot mode, split the block and add the next one
      if (autopilot) {
        splitBlockAndAddNextOneIfOverlaps();
        setRobotPrecision();
      }
    }

    // If the camera is below the current height of the stack, move it up
    if (camera.position.y < boxHeight * (stack.length - 2) + 4) {
      camera.position.y += speed * timePassed;
    }

    // Update the physics and render the scene
    updatePhysics(timePassed);
    renderer.render(scene, camera);
  }

  // Update lastTime to the current time
  lastTime = time;
}

function updatePhysics(timePassed) {
  // Step the physics world forward in time
  world.step(timePassed / 1000);

  // For each overhang in the game
  overhangs.forEach((element) => {
    // Copy the position and rotation from the physics object to the visual object
    element.threejs.position.copy(element.cannonjs.position);
    element.threejs.quaternion.copy(element.cannonjs.quaternion);
  });
}
window.addEventListener("resize", () => {
  // Adjust camera
  console.log("resize", window.innerWidth, window.innerHeight);
  const aspect = window.innerWidth / window.innerHeight;
  const width = 10;
  const height = width / aspect;

  camera.top = height / 2;
  camera.bottom = height / -2;

  // Reset renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
});
