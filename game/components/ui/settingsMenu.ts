

export default class SettingsMenu
{

    private container!: Phaser.GameObjects.Container


    
    constructor(scene: Phaser.Scene) {
        
        const { width, height } = scene.scale;

        this.container = scene.add.container(width / 10, 50)

        // Create the semi-transparent gray background
        const background = scene.add.graphics();
        background.fillStyle(0x000000, 0.5);

        background.fillRect(0, 0, width, height);

        // Create the main menu container
        this.container = scene.add.container(width / 10, 50);

        // Create the dark gray buttons
        const closeButton = scene.add.text(0, 0, 'X', { color: '#333', fontSize: '24px' });
        const pauseResumeButton = scene.add.text(0, 50, 'Pause Session', { color: '#333', fontSize: '18px' });
        const videoSettingsButton = scene.add.text(0, 100, 'Video Settings', { color: '#333', fontSize: '18px' });
        const controlsButton = scene.add.text(0, 150, 'Controls', { color: '#333', fontSize: '18px' });
        const stakesButton = scene.add.text(0, 200, 'Stakes', { color: '#333', fontSize: '18px' });
        const disconnectButton = scene.add.text(0, 250, 'Disconnect', { color: '#333', fontSize: '18px' });

        // Add buttons to the container
        this.container.add([closeButton, pauseResumeButton, videoSettingsButton, controlsButton, stakesButton, disconnectButton]);

        this.container.list.forEach(button => {
            // Add click listener to each button
            button.setInteractive().on('pointerdown', () => {
                switch (button) {
                    case closeButton:
                        // Close the menu
                        this.close();

                    case pauseResumeButton:

                    case videoSettingsButton:

                    case controlsButton:

                    case stakesButton:

                    case disconnectButton:
                }
            });
        });

        // Add the container to the scene
        scene.add.existing(this.container);
    }

    private close() {
        this.container.destroy();
        // Additional cleanup or logic for closing the menu
    }
}