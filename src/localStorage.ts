type SubscriberFn = (value: boolean) => void

type DbElement<T, I = string> = T & {
    id: I
}

export const createIndexedDB = <T>(dbName: string, objectStore: string) => {
    let db: null | IDBDatabase = null
    let open = false
    let openSubs: Record<number, SubscriberFn> = {}
    let subIndex = 0

    const notifySubs = (message: boolean) => {
        Object.values(openSubs).forEach(subFn => {
            subFn(message)
        })
    }

    const request = indexedDB.open(dbName)

    request.onerror = () => { console.error("Unable to open indexedDB.") }
    request.onsuccess = () => { 
        db = request.result
        open = true
        notifySubs(true)
    }
    request.onupgradeneeded = (event) => {
        const target = event.target as EventTarget & { result: IDBDatabase };

        const db = target.result;
        db.createObjectStore(objectStore, { keyPath: "id" });
    };

    return {
        isOpen: (fn: SubscriberFn) => {
            fn(open)
            const idx = subIndex
            subIndex = subIndex + 1

            openSubs[`${idx}`] = fn

            return () => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [idx]: _, ...rest } = openSubs
                openSubs = rest
            }
        },
        set: (value: DbElement<T>) =>
            new Promise<IDBValidKey>((resolve, reject) => {
                if (!db) { reject("Unable to add to indexedDB."); return }

                const request = db
                    .transaction([objectStore], "readwrite")
                    .objectStore(objectStore)
                    .put(value)

                request.onsuccess = () => { resolve(request.result) }
                request.onerror = () => { reject(request.error) }
            }),
        get: (id: DbElement<T>["id"]) =>
            new Promise<DbElement<T>>((resolve, reject) => {
                if (!db) { reject("Unable to get from indexedDB."); return }

                const request = db
                    .transaction([objectStore], "readonly")
                    .objectStore(objectStore)
                    .get(id) as IDBRequest<DbElement<T>>

                request.onsuccess = () => { resolve(request.result) }
                request.onerror = () => { reject(request.error) }
            }),
        getAll: () =>
            new Promise<Array<DbElement<T>>>((resolve, reject) => {
                if (!db) { reject("Unable to get from indexedDB."); return }

                const request = db
                    .transaction([objectStore], "readonly")
                    .objectStore(objectStore)
                    .getAll() as IDBRequest<Array<DbElement<T>>>

                request.onsuccess = () => { resolve(request.result) }
                request.onerror = () => { reject(request.error) }
            }),
        remove: (id: DbElement<T>["id"]) =>
            new Promise<undefined>((resolve, reject) => {
                if (!db) { reject("Unable to remove from indexedDB."); return }

                const request = db
                    .transaction([objectStore], "readwrite")
                    .objectStore(objectStore)
                    .delete(id)

                request.onsuccess = () => { resolve(request.result) }
                request.onerror = () => { reject(request.error) }
            })
    }
}