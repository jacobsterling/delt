import { useState } from 'react';
import { auth, storage } from '../lib/firebase';
import Loader from './Loader';
import { ref, uploadBytesResumable, getDownloadURL} from "firebase/storage";


export default function ImageUploader() {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [downloadURL, setDownloadURL] = useState(null);

    // Creates a Firebase Upload Task
    const uploadFile = async (e) => {
        //Get the file
        const file = Array.from(e.target.files)[0]
        const extention = file.type.split('/')[1];

        // Makes reference to the storage bucket location
        const uploadRef = ref(storage,`uploads/${auth.currentUser.uid}/${Date.now()}.${extention}`);

        setUploading(true);

        // Starts the upload
        const uploadTask = uploadBytesResumable(uploadRef,file);
        
        uploadTask.on('state_changed', 
        (snapshot) => {
          // Observe state change events such as progress, pause, and resume
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
          setProgress(((snapshot.bytesTransferred / snapshot.totalBytes) * 100).toFixed(0));
          switch (snapshot.state) {
            case 'paused':
              console.log('Upload is paused');
              break;
            case 'running':
              console.log('Upload is running');
              break;
          }
        }, 
        (error) => {
            uploadTask.cancel();
            console.log(error)
        }, 
        () => {
          // Handle successful uploads on complete
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            setDownloadURL(downloadURL);
            setUploading(false);
          });
        }
      );
      
    }

    return (    
        <div className='box'>
            <Loader show={uploading} />
            {uploading && <h3>{progress}%</h3>}
            {!uploading && (
                <>
                    <label className='btn'>
                        📸 Upload Img
                        <input type='file' onChange={uploadFile} accept="image/x-png,image/gif,image/jpeg" />
                    </label>
                </>
            )}

            {downloadURL && <code className="upload-snippet">{`![alt](${downloadURL})`}</code>}
        </div>
    );
}