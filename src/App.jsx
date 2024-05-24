import { useState, useEffect } from 'react'
import * as THREE from "three"
import * as CANNON from "cannon-es"
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function App() {

  useEffect(() => {
    const canvas = document.getElementById("myCanvas")
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1000)
    camera.position.set(0, 30, 40)

    const controls = new OrbitControls(camera, renderer.domElement)

    // LIGHTS
    const ambientLights = new THREE.AmbientLight(0xffffff, 1)
    scene.add(ambientLights)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    directionalLight.position.set(20, 40, 10);

    // Adjust the shadow camera properties to make the light cover a wider area
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;

    // Optional: Adjust the shadow map resolution for better shadow quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;

    // Optional: Adjust the near and far planes of the shadow camera
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;

    // // Helper to visualize the shadow camera frustum
    // const shadowCameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
    // scene.add(shadowCameraHelper);

    // GEOMETRIES

    /* Plane */
    const planeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(30, 30), // Adjusted the height to be more substantial
      new THREE.MeshStandardMaterial({ color: 0xFFFF00, side: THREE.DoubleSide })
    )
    scene.add(planeMesh)
    planeMesh.receiveShadow = true
    planeMesh.userData.ground = true

    /* Box */
    const boxMesh = new THREE.Mesh(
      new THREE.BoxGeometry(5, 5, 5),
      new THREE.MeshNormalMaterial(),
    )
    scene.add(boxMesh)
    boxMesh.castShadow = true
    boxMesh.userData.draggable = true
    boxMesh.userData.name = "Box"

    /* Circle */
    const sphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(3),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    )
    scene.add(sphereMesh)
    sphereMesh.castShadow = true
    sphereMesh.userData.draggable = true
    sphereMesh.userData.name = "Sphere"

    /* Cylinder Body */
    const cylinderMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    )
    scene.add(cylinderMesh)
    cylinderMesh.castShadow = true
    cylinderMesh.userData.draggable = true
    cylinderMesh.userData.name = "cylinder"

    // RAYCASTER
    const raycaster = new THREE.Raycaster()
    const clickMouse = new THREE.Vector2()
    const moveMouse = new THREE.Vector2()
    let draggable

    window.addEventListener("click", (e) => {
      if (draggable) {
        console.log(`dragging dropable  ${draggable.userData.name} `)
        draggable = null
        return
      }

      clickMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      clickMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(clickMouse, camera)
      const intersects = raycaster.intersectObjects(scene.children)

      if (intersects.length > 0 && intersects[0].object.userData.draggable) {
        draggable = intersects[0].object
        console.log(`found draggable ${draggable.userData.name}`)
      }
    })

    window.addEventListener("mousemove", (e) => {
      moveMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      moveMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    })

    // Create a map to store the association between THREE.Mesh objects and their Cannon.js bodies
    const meshToBody = new Map();


    // Modify the dragObject function to use the meshToBody map
    const dragObject = () => {
      if (draggable != null) {
        raycaster.setFromCamera(moveMouse, camera);
        const intersects = raycaster.intersectObjects(scene.children);
        if (intersects.length > 0) {
          for (let elem of intersects) {
            if (!elem.object.userData.ground) continue;
            const point = elem.point;
            const body = meshToBody.get(draggable);
            if (body) {
              body.position.set(point.x, draggable.position.y, point.z);
              draggable.position.copy(body.position);
            }
          }
        }
      }
    };


    

    // PHYSICS WORLD
    const world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.81, 0),
    }); 


    /* Ground Body */
    const groundPhyMat = new CANNON.Material();
    const groundBody = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(15, 15, 0.1)),
      type: CANNON.Body.STATIC,
      material: groundPhyMat,
    });
    world.addBody(groundBody);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

    /* Box Body */
    const boxPhyMat = new CANNON.Material();
    const boxBody = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(2.5, 2.5, 2.5)),
      mass: 1,
      position: new CANNON.Vec3(0, 10, 0),
      material: boxPhyMat,
    });
    world.addBody(boxBody);

    const groundContactMaterial = new CANNON.ContactMaterial(
      groundPhyMat,
      boxPhyMat,
      { friction: 0.1, }
    );
    world.addContactMaterial(groundContactMaterial);

    /* Sphere Body */
    const spherePhyMat = new CANNON.Material();
    const sphereBody = new CANNON.Body({
      shape: new CANNON.Sphere(3), // Corrected the sphere size
      mass: 1,
      position: new CANNON.Vec3(10, 10, 0),
      material: spherePhyMat,
    });
    world.addBody(sphereBody);

    const sphereContactMaterial = new CANNON.ContactMaterial(
      spherePhyMat,
      groundPhyMat,
      { restitution: 0.1 }
    );
    sphereBody.linearDamping = 0.31;

    world.addContactMaterial(sphereContactMaterial);

    /* Cylinder Body */
    const cylinderPhyMat = new CANNON.Material()
    const cylinderBody = new CANNON.Body({
      shape: new CANNON.Cylinder(2, 2, 10, 10),
      mass: 1,
      position: new CANNON.Vec3(-10, 5, 0),
      material: cylinderPhyMat
    })
    world.addBody(cylinderBody)

    const cylinderContactMaterial = new CANNON.ContactMaterial(
      cylinderBody,
      groundBody,
      { friction: 0.01 }
    )

    world.addContactMaterial(cylinderContactMaterial)


    // Associate Cannon.js bodies with their corresponding THREE.Mesh objects
    meshToBody.set(boxMesh, boxBody);
    meshToBody.set(sphereMesh, sphereBody);
    meshToBody.set(cylinderMesh, cylinderBody);



    const timeStep = 1 / 60

    // ANIMATION FUNCTION
    const animate = () => {
      world.step(timeStep)


      // Synchronize three.js meshes with Cannon.js bodies
      planeMesh.position.copy(groundBody.position);
      planeMesh.quaternion.copy(groundBody.quaternion);

      boxMesh.position.copy(boxBody.position);
      boxMesh.quaternion.copy(boxBody.quaternion);

      sphereMesh.position.copy(sphereBody.position);
      sphereMesh.quaternion.copy(sphereBody.quaternion);

      cylinderMesh.position.copy(cylinderBody.position)
      cylinderMesh.quaternion.copy(cylinderBody.quaternion)

      dragObject()

      // Inside the animate function, update the positions of Cannon.js bodies based on their associated THREE.Mesh objects
      boxBody.position.copy(boxMesh.position);
      sphereBody.position.copy(sphereMesh.position);
      cylinderBody.position.copy(cylinderMesh.position);



      controls.update()
      renderer.render(scene, camera)
      window.requestAnimationFrame(animate)
    }

    // WINDOW RESIZING FUNCTION
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener("resize", onWindowResize, false)

    animate()

  }, [])

  return (
    <div>
      <canvas id='myCanvas' />
    </div>
  )
}

export default App
