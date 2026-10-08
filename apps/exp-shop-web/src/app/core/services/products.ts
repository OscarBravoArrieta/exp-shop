import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import type { Product } from '../models/products.model';

export interface CreateProductInput {
    title: string;
    price: number;
    description: string;
    images?: string[];
    slug: string;
    quantity?: number;
    categoryId?: string;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
    id: string;
}

const PRODUCT_FIELDS = `
  id
  title
  price
  description
  images
  slug
  quantity
  isActive
  categoryId
  createdAt
  updatedAt
`;

const PRODUCTS_QUERY = gql`
  query Products($categoryId: ID) {
    products(categoryId: $categoryId) { ${PRODUCT_FIELDS} }
  }
`;

const PRODUCT_BY_ID_QUERY = gql`
  query Product($id: ID!) {
    product(id: $id) { ${PRODUCT_FIELDS} }
  }
`;

const CREATE_PRODUCT_MUTATION = gql`
  mutation CreateProduct($createProductInput: CreateProductInput!) {
    createProduct(createProductInput: $createProductInput) { ${PRODUCT_FIELDS} }
  }
`;

const UPDATE_PRODUCT_MUTATION = gql`
  mutation UpdateProduct($updateProductInput: UpdateProductInput!) {
    updateProduct(updateProductInput: $updateProductInput) { ${PRODUCT_FIELDS} }
  }
`;

const SOFT_DELETE_PRODUCT_MUTATION = gql`
  mutation SoftDeleteProduct($id: ID!) {
    softDeleteProduct(id: $id) { ${PRODUCT_FIELDS} }
  }
`;

/**
 * `products`/`product` son públicas del lado del backend (catálogo sin
 * login); crear/editar/eliminar exige rol admin — ver ProductsResolver.
 */
@Injectable({ providedIn: 'root' })
export class Products {
    private readonly apollo = inject(Apollo);

    /** Sin `categoryId`, el backend devuelve el catálogo completo (ver ProductsService.findAll). */
    getProducts(categoryId?: string): Observable<Product[]> {
        return this.apollo
            .query<{ products: Product[] }>({
                query: PRODUCTS_QUERY,
                variables: { categoryId },
                fetchPolicy: 'network-only',
            })
            .pipe(map(result => result.data?.products ?? []));
    }

    getProductById(id: string): Observable<Product> {
        return this.apollo
            .query<{ product: Product }>({
                query: PRODUCT_BY_ID_QUERY,
                variables: { id },
                fetchPolicy: 'network-only',
            })
            .pipe(
                map(result => {
                    if (!result.data) {
                        throw new Error(`No se encontró el producto ${id}`);
                    }
                    return result.data.product;
                })
            );
    }

    createProduct(createProductInput: CreateProductInput): Observable<Product> {
        return this.apollo
            .mutate<{ createProduct: Product }>({
                mutation: CREATE_PRODUCT_MUTATION,
                variables: { createProductInput },
            })
            .pipe(
                map(result => {
                    if (!result.data) {
                        throw new Error('No se pudo crear el producto');
                    }
                    return result.data.createProduct;
                })
            );
    }

    updateProduct(updateProductInput: UpdateProductInput): Observable<Product> {
        return this.apollo
            .mutate<{ updateProduct: Product }>({
                mutation: UPDATE_PRODUCT_MUTATION,
                variables: { updateProductInput },
            })
            .pipe(
                map(result => {
                    if (!result.data) {
                        throw new Error('No se pudo actualizar el producto');
                    }
                    return result.data.updateProduct;
                })
            );
    }

    /** Baja lógica: el backend marca isActive en false, no borra el registro. */
    softDeleteProduct(id: string): Observable<Product> {
        return this.apollo
            .mutate<{ softDeleteProduct: Product }>({
                mutation: SOFT_DELETE_PRODUCT_MUTATION,
                variables: { id },
            })
            .pipe(
                map(result => {
                    if (!result.data) {
                        throw new Error('No se pudo desactivar el producto');
                    }
                    return result.data.softDeleteProduct;
                })
            );
    }
}
