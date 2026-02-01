import { Component } from '@/lib/types';

export default function ComponentCard(component: Component) {
    return (
        <li>component card {component.id}</li>
    )
} 