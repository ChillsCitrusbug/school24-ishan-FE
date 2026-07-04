import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  Card,
  Field,
  Input,
  Banner,
  Icon,
  Spinner,
} from '@/components'
import {
  createProduct,
  getProduct,
  updateProduct,
  uploadProductImage,
  type ProductVariantInput,
} from '@/features/products/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'
import { staffNavGroups, staffTabs } from './staffNav'

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg']
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

interface VariantRow extends ProductVariantInput {
  key: string
}

let variantKeySeq = 0
function newVariantKey(): string {
  variantKeySeq += 1
  return `v${variantKeySeq}`
}

interface ImageRow {
  id: string
  image_url: string
}

/**
 * SC-047 · Product Create / Edit (variants + images) — School Admin /
 * Staff with Menu Management access (FR-024). Reuses the approved
 * Sc047ProductForm.tsx structure for BOTH create and edit, matching the
 * "one shared form component" precedent already used for
 * StaffFormScreen.tsx/ClassFormScreen.tsx.
 */
export function ProductFormScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { productId } = useParams<{ productId?: string }>()
  const isEditMode = Boolean(productId)
  const isStaff = user?.role === 'staff'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [description, setDescription] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [variants, setVariants] = useState<VariantRow[]>([
    { key: newVariantKey(), variant_label: '', price: '' },
  ])
  const [images, setImages] = useState<ImageRow[]>([])

  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isEditMode || !productId) {
      setIsLoading(false)
      return
    }
    let cancelled = false
    getProduct(productId)
      .then((product) => {
        if (cancelled) return
        setName(product.name)
        setCategoryName(product.category_name ?? '')
        setDescription(product.description ?? '')
        setBasePrice(product.base_price)
        setVariants(
          product.variants.map((v) => ({
            key: newVariantKey(),
            id: v.id,
            variant_label: v.variant_label,
            price: v.price,
          })),
        )
        setImages(product.images.map((i) => ({ id: i.id, image_url: i.image_url })))
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(extractErrorMessage(err, 'This product could not be found.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isEditMode, productId])

  function updateVariant(key: string, field: 'variant_label' | 'price', value: string) {
    setVariants((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }

  function addVariant() {
    setVariants((rows) => [...rows, { key: newVariantKey(), variant_label: '', price: '' }])
  }

  function removeVariant(key: string) {
    setVariants((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const payload = {
        name,
        category_name: categoryName,
        description: description || null,
        base_price: basePrice,
        variants: variants.map((v) => ({
          id: v.id,
          variant_label: v.variant_label,
          price: v.price,
        })),
      }
      if (isEditMode && productId) {
        await updateProduct(productId, payload)
      } else {
        const created = await createProduct(payload)
        navigate(`/school-admin/products/${created.id}/edit`, { replace: true })
        return
      }
      navigate('/school-admin/products')
    } catch (err) {
      setError(extractErrorMessage(err, 'Every variant needs a price. Check each one and try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleFileSelected(file: File) {
    setImageError(null)
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Only PNG or JPG images are allowed.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('This image is larger than 2 MB. Choose a smaller file.')
      return
    }
    if (!productId) return
    setIsUploadingImage(true)
    try {
      const uploaded = await uploadProductImage(productId, file)
      setImages((rows) => [...rows, { id: uploaded.id, image_url: uploaded.image_url }])
    } catch (err) {
      setImageError(extractErrorMessage(err, 'Failed to upload the image. Please try again.'))
    } finally {
      setIsUploadingImage(false)
    }
  }

  const sidebar = isStaff ? (
    <Sidebar
      brandTitle="School24"
      brandSubtitle={user?.school_name ?? undefined}
      groups={staffNavGroups('menu')}
      user={{ initials: initialsOf(user.full_name), name: user.full_name, role: 'Staff' }}
    />
  ) : (
    <Sidebar
      brandTitle="School24"
      brandSubtitle={user?.school_name ?? undefined}
      groups={schoolAdminNavGroups('menu')}
      user={{
        initials: user ? initialsOf(user.full_name) : '',
        name: user?.full_name ?? '',
        role: 'School Admin',
      }}
    />
  )

  return (
    <AppShell
      sidebar={sidebar}
      topbar={<Topbar right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={isStaff ? staffTabs('menu') : schoolAdminTabs('menu')} />}
    >
      <div className="mx-auto max-w-lg">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/school-admin/products')}
        >
          Products
        </Button>

        {isLoading ? (
          <div role="status" aria-label="Loading" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : loadError ? (
          <Card className="p-5">
            <Banner tone="danger">{loadError}</Banner>
          </Card>
        ) : (
          <Card className="p-5">
            <h1 className="text-xl font-bold text-ink">
              {isEditMode ? 'Edit product' : 'Add a product'}
            </h1>
            <p className="mt-1 text-sm text-muted">Add details, an image, and variants.</p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              {error && <Banner tone="danger">{error}</Banner>}
              <Field label="Product name">
                <Input
                  placeholder="e.g. Chicken Wrap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category" hint="Type any category.">
                  <Input
                    placeholder="e.g. Hot Food"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Base price">
                  <Input
                    placeholder="$0.00"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <Field label="Description" hint="Optional">
                <Input
                  placeholder="Short description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>

              {isEditMode && (
                <div>
                  <div className="mb-1.5 text-sm font-medium text-ink">Image</div>
                  {imageError && (
                    <div className="mb-2">
                      <Banner tone="danger">{imageError}</Banner>
                    </div>
                  )}
                  {images.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {images.map((img) => (
                        <img
                          key={img.id}
                          src={img.image_url}
                          alt=""
                          className="h-16 w-16 rounded-control border border-line object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="grid w-full place-items-center rounded-card border-2 border-dashed border-line px-6 py-7 text-center"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-mint text-brand">
                      {isUploadingImage ? <Spinner className="h-4 w-4" /> : <Icon name="plus" />}
                    </span>
                    <p className="mt-2 text-sm text-ink">
                      Drag an image here, or <span className="font-semibold text-brand-deep">browse</span>
                    </p>
                    <p className="text-xs text-muted">PNG or JPG, up to 2 MB</p>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleFileSelected(file)
                      e.target.value = ''
                    }}
                  />
                </div>
              )}
              {!isEditMode && (
                <Banner tone="info">Save the product first, then add images on the edit screen.</Banner>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">Variants</span>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="text-sm font-semibold text-brand-deep hover:text-brand"
                  >
                    + Add variant
                  </button>
                </div>
                <div className="space-y-2">
                  {variants.map((v) => (
                    <div key={v.key} className="flex gap-2">
                      <Input
                        aria-label="Variant name"
                        className="flex-1"
                        value={v.variant_label}
                        onChange={(e) => updateVariant(v.key, 'variant_label', e.target.value)}
                      />
                      <Input
                        aria-label="Variant price"
                        className="w-28"
                        placeholder="$0.00"
                        value={v.price}
                        onChange={(e) => updateVariant(v.key, 'price', e.target.value)}
                      />
                      {variants.length > 1 && (
                        <button
                          type="button"
                          aria-label="Remove variant"
                          onClick={() => removeVariant(v.key)}
                          className="rounded p-2 text-muted hover:bg-canvas"
                        >
                          <Icon name="close" className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" loading={isSubmitting}>
                  Save product
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/school-admin/products')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
