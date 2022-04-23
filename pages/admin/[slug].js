import Metatags from '../../components/Metatags'
import styles from '../../styles/Admin.module.css';
import AuthCheck from '../../components/AuthCheck';
import { db, auth } from '../../lib/firebase';
import { doc, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import ImageUploader from '../../components/ImageUploader'
import { useState } from 'react';
import { useRouter } from 'next/router';

import { useDocument, useDocumentDataOnce, useDocumentData } from 'react-firebase-hooks/firestore';

import { useForm, useFormState } from 'react-hook-form';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function AdminDesignEdit(props) {
  return (
      <AuthCheck>
        <Metatags title= 'admin page' />
        <DesignManager/>
      </AuthCheck>
  );
}

  function DesignManager() {
    const [preview, setPreview] = useState(false)

    const router = useRouter();
    const { slug } = router.query;

    const designRef = doc(db,`users/${auth.currentUser.uid}/designs`,slug);
    const [design] = useDocumentData(designRef)

    const username = design?.username

    console.log(username)
    return(
      <main className={styles.container}>
        {design && (
          <>
            <section>
              <h1>{design.title}</h1>
              <p>ID: {design.slug}</p>
              <DesignForm designRef={designRef} defaultValues={design} preview={preview} />
            </section>

            <aside>
              <h3>Tools</h3>
              <button onClick={() => setPreview(!preview)}>{preview ? 'Edit' : 'Preview'}</button>
              <Link href={`/${username}/${design.slug}`} passHref>
                <button className='btn-blue'>Live view</button>
              </Link>
              <DeletePostButton designRef={designRef} />
            </aside>
          </>
        )}
      </main>
    );
  }

function DesignForm({ defaultValues, designRef, preview }) {
  const { register, handleSubmit, reset, watch, formState: { errors, isValid, isDirty }} = useForm({ defaultValues, mode: 'onChange' });

  const updateDesign = async ({ content, published }) => {
    await setDoc(designRef,{
      content,
      published,
      updatedAt: serverTimestamp(),
    });
  
    reset({ content, published })

    toast.success('Design update success !')
  }

  return(
    <form onSubmit={handleSubmit(updateDesign)}>
      {preview && (
        <div className="card">
          <ReactMarkdown>{watch('content')}</ReactMarkdown>
        </div>
      )}

      <div className={preview ? styles.hidden : styles.controls}>

        <ImageUploader />

        <textarea {...register("content", {
          maxLength: { value: 20000, message: 'content is too long' },
          minLength: { value: 10, message: 'content is too short' },
          required: { value: true, message: 'content is required'}
        })} >
        </textarea>

        {errors.content && <p className="text-danger">{errors.content.message}</p>}

        <fieldset>
          <input {...register('published')} className={styles.checkbox} type='checkbox' />

          <label>Published</label>
        </fieldset>

        <button type="submit" className='btn-green' disabled={!isDirty || !isValid}>

          Save Changes
        </button>
      </div>
    </form>
  );
}

function DeletePostButton({ designRef }) {
  const router = useRouter();

  const deleteDesign = async () => {
    const doIt = confirm('are you sure!');
    if (doIt) {
      await deleteDoc(designRef);
      router.push('/admin');
      toast('design annihilated ', { icon: '🗑️' });
    }
  };

  return (
    <button className="btn-red" onClick={deleteDesign}>
      Delete
    </button>
  );
}